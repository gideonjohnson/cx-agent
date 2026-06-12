'use strict'
// CX Agent — Electron main process
// Spawns the Bun server (dashboard + chat + scheduler) and shows it in a native window.

const { app, BrowserWindow, Tray, Menu, nativeImage, dialog, shell, Notification } = require('electron')
const { spawn, spawnSync } = require('child_process')

let autoUpdater = null
try { autoUpdater = require('electron-updater').autoUpdater } catch {}
const path  = require('path')
const http  = require('http')
const fs    = require('fs')
const os    = require('os')

const PORT = parseInt(process.env.DASHBOARD_PORT || '4747', 10)

let APP_DIR  = ''
let DATA_DIR = ''
let LOG_FILE = ''

let mainWindow   = null
let loadingWin   = null
let tray         = null
let serverProc   = null
let isQuitting   = false

let serverRestartCount = 0
const MAX_RESTARTS = 3

// ── Bun ───────────────────────────────────────────────────────────────────────

function findBun() {
  // Bundled bun.exe ships inside the installer — always check first
  const bundled = path.join(__dirname, 'bun.exe')
  if (fs.existsSync(bundled)) return bundled

  // Fall back to user-installed Bun
  const home = os.homedir()
  const localApp = process.env.LOCALAPPDATA || ''
  const candidates = [
    path.join(home, '.bun', 'bin', 'bun.exe'),
    path.join(localApp, 'Microsoft', 'WinGet', 'Packages',
      'Oven-sh.Bun_Microsoft.Winget.Source_8wekyb3d8bbwe', 'bun.exe'),
  ]
  for (const c of candidates) {
    if (fs.existsSync(c)) return c
  }
  try {
    const r = spawnSync('bun', ['--version'], { windowsHide: true, encoding: 'utf8' })
    if (r.status === 0) return 'bun'
  } catch {}
  return null
}

function installBun() {
  return new Promise((resolve) => {
    try {
      const wg = spawnSync('winget', [
        'install', 'Oven-sh.Bun',
        '--silent', '--accept-source-agreements', '--accept-package-agreements'
      ], { windowsHide: true, encoding: 'utf8' })
      if (wg.status === 0) { resolve(); return }
    } catch {}

    const ps = spawn('powershell.exe', [
      '-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command',
      `$s=(Invoke-WebRequest 'https://bun.sh/install.ps1' -UseBasicParsing).Content;Invoke-Expression $s`
    ], { windowsHide: true })
    ps.on('close', () => resolve())
    ps.on('error', () => resolve())
  })
}

function runBun(bunPath, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(bunPath, args, {
      cwd: APP_DIR,
      windowsHide: true,
      stdio: 'ignore',
      ...opts,
    })
    p.on('close', code => code === 0 ? resolve() : reject(new Error(`bun ${args[0]} failed (${code})`)))
    p.on('error', reject)
  })
}

// ── Server ────────────────────────────────────────────────────────────────────

function startServer(bunPath) {
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true })
  const logFd = fs.openSync(LOG_FILE, 'a')

  serverProc = spawn(bunPath, ['run', 'src/index.ts'], {
    cwd: APP_DIR,
    stdio: ['ignore', logFd, logFd],
    windowsHide: true,
    detached: false,
    env: { ...process.env, DASHBOARD_PORT: String(PORT), CX_DATA_DIR: DATA_DIR },
  })

  serverProc.on('error', err => console.error('[server]', err.message))
  serverProc.on('exit', (code, signal) => {
    if (isQuitting) return
    console.warn('[server] exited unexpectedly', code, signal)
    if (serverRestartCount < MAX_RESTARTS) {
      serverRestartCount++
      console.log(`[server] restarting (attempt ${serverRestartCount}/${MAX_RESTARTS})...`)
      setTimeout(() => startServer(bunPath), 2000)
    } else {
      dialog.showErrorBox(
        'CX Agent — Server Stopped',
        `The server crashed and could not be restarted.\n\nCheck the log for details:\n${LOG_FILE}\n\nPlease relaunch CX Agent.`
      )
    }
  })
}

function waitForServer(timeout = 40000) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeout
    const check = () => {
      const req = http.get(
        { hostname: 'localhost', port: PORT, path: '/api/state', timeout: 1500 },
        res => {
          res.resume()
          // 200 = dashboard ready; 302 = setup redirect — both mean server is up
          if (res.statusCode === 200 || res.statusCode === 302) { resolve(); return }
          retry()
        }
      )
      req.on('error', retry)
      req.on('timeout', () => { req.destroy(); retry() })
      req.end()
    }
    const retry = () => {
      if (Date.now() >= deadline) reject(new Error('Server did not start in time'))
      else setTimeout(check, 600)
    }
    setTimeout(check, 600)
  })
}

// ── Loading window ────────────────────────────────────────────────────────────

function showLoading() {
  loadingWin = new BrowserWindow({
    width: 400,
    height: 280,
    frame: false,
    resizable: false,
    center: true,
    alwaysOnTop: true,
    backgroundColor: '#0d0f14',
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  })
  loadingWin.loadFile(path.join(__dirname, 'loading.html'))
  loadingWin.on('closed', () => { loadingWin = null })
}

function setLoadingStatus(msg) {
  if (!loadingWin || loadingWin.isDestroyed()) return
  loadingWin.webContents.executeJavaScript(
    `document.getElementById('status') && (document.getElementById('status').textContent = ${JSON.stringify(msg)})`
  ).catch(() => {})
}

// ── Main window ───────────────────────────────────────────────────────────────

function openMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show()
    mainWindow.focus()
    return
  }

  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    title: 'CX Agent',
    backgroundColor: '#0d0f14',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
    },
    show: false,
  })

  mainWindow.loadURL(`http://localhost:${PORT}`)

  mainWindow.once('ready-to-show', () => {
    if (loadingWin && !loadingWin.isDestroyed()) loadingWin.close()
    mainWindow.show()
  })

  mainWindow.on('close', e => {
    if (!isQuitting) {
      e.preventDefault()
      mainWindow.hide()
      tray && tray.displayBalloon({
        title: 'CX Agent',
        content: 'Still running in the background. Click the tray icon to reopen.',
        iconType: 'info',
      })
    }
  })
}

// ── Tray ──────────────────────────────────────────────────────────────────────

function buildTrayIcon() {
  let icon
  const icoPath = path.join(__dirname, 'icon.ico')
  try {
    icon = fs.existsSync(icoPath)
      ? nativeImage.createFromPath(icoPath)
      : nativeImage.createEmpty()
  } catch {
    icon = nativeImage.createEmpty()
  }

  tray = new Tray(icon)
  tray.setToolTip('CX Agent')

  const menu = Menu.buildFromTemplate([
    { label: 'Open Dashboard', click: () => openMainWindow() },
    { label: 'Open Log File', click: () => shell.openPath(LOG_FILE) },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true
        if (mainWindow && !mainWindow.isDestroyed()) mainWindow.destroy()
        app.quit()
      },
    },
  ])

  tray.setContextMenu(menu)
  tray.on('double-click', () => openMainWindow())
}

// ── Startup ───────────────────────────────────────────────────────────────────

app.on('window-all-closed', e => {
  if (process.platform !== 'darwin') e.preventDefault?.()
})

app.on('activate', () => openMainWindow())
app.on('before-quit', () => { isQuitting = true })
app.on('quit', () => {
  if (serverProc && !serverProc.killed) {
    try { serverProc.kill() } catch {}
  }
})

app.whenReady().then(async () => {
  APP_DIR  = app.getAppPath()
  DATA_DIR = app.getPath('userData')
  LOG_FILE = path.join(DATA_DIR, 'server.log')

  showLoading()
  buildTrayIcon()

  // 1. Ensure Bun
  setLoadingStatus('Checking runtime...')
  let bun = findBun()

  if (!bun) {
    setLoadingStatus('Installing Bun runtime (one-time, ~30s)...')
    await installBun()
    bun = findBun()
  }

  if (!bun) {
    dialog.showErrorBox(
      'Setup Failed',
      'Could not install the Bun runtime.\n\nPlease install it manually from https://bun.sh then relaunch CX Agent.'
    )
    app.quit()
    return
  }

  // 2. Install dependencies (first run only)
  const modulesDir = path.join(APP_DIR, 'node_modules')
  if (!fs.existsSync(modulesDir)) {
    setLoadingStatus('Installing dependencies (first run, ~1 min)...')
    try {
      await runBun(bun, ['install', '--production'])
    } catch (err) {
      dialog.showErrorBox(
        'Setup Failed',
        `Could not install dependencies.\n\nCheck the log for details:\n${LOG_FILE}\n\nError: ${err.message}`
      )
      app.quit()
      return
    }
  }

  // 3. Start server
  setLoadingStatus('Starting server...')
  startServer(bun)

  try {
    await waitForServer(40000)
  } catch {
    dialog.showErrorBox(
      'Startup Error',
      `The server failed to start.\n\nCheck the log for details:\n${LOG_FILE}`
    )
    app.quit()
    return
  }

  // 4. Open app
  openMainWindow()

  // 5. Tray alert polling — escalations + pending approvals
  let lastEscCount = 0
  let lastApprovalCount = 0
  function checkAlerts() {
    const req = http.get(
      { hostname: 'localhost', port: PORT, path: '/api/state', timeout: 3000 },
      res => {
        let data = ''
        res.on('data', chunk => { data += chunk })
        res.on('end', () => {
          try {
            const state = JSON.parse(data)
            const esc       = (state.openEscalations || []).length
            const approvals = (state.pendingApprovals || []).length
            if (Notification.isSupported()) {
              if (esc > lastEscCount) {
                new Notification({
                  title: 'CX Agent — Escalation',
                  body: `${esc - lastEscCount} new escalation(s) need your attention.`,
                }).show()
              }
              if (approvals > lastApprovalCount) {
                new Notification({
                  title: 'CX Agent — Pending Approval',
                  body: `${approvals - lastApprovalCount} message(s) waiting for your approval.`,
                }).show()
              }
            }
            lastEscCount      = esc
            lastApprovalCount = approvals
          } catch {}
        })
      }
    )
    req.on('error', () => {})
    req.on('timeout', () => { req.destroy() })
    req.end()
  }
  setInterval(checkAlerts, 60000)

  // 6. Check for updates
  if (app.isPackaged && autoUpdater) {
    autoUpdater.checkForUpdatesAndNotify().catch(() => {})
  }
})

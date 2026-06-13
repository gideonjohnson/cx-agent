
import { all, first, run } from '../lib/db.js'

export const proactiveTools = [
  {
    name: 'scan_for_critical_issues',
    description: 'Scans the system for red-flag events that require proactive customer outreach (e.g. delayed orders, failed payments).',
    input_schema: {
      type: 'object',
      properties: {
        sector: { type: 'string', description: 'Sector to scan (orders, billing, account)' },
        timeframe_days: { type: 'number', description: 'Lookback window in days' },
      },
      required: ['sector'],
    },
  },
]

export const proactiveHandlers = {
  scan_for_critical_issues: async (input: Record<string, unknown>) => {
    const { sector, timeframe_days = 3 } = input as { sector: string; timeframe_days?: number };
    
    if (sector === 'orders') {
      const issues = all(`SELECT o.id, c.email, o.status FROM orders o JOIN customers c ON o.customer_id = c.id WHERE o.status = 'delayed' AND o.updated_at < date('now', '-${timeframe_days} days')`);
      return { success: true, verified: true, results: issues, message: `Found ${issues.length} delayed orders requiring proactive outreach.` };
    }
    
    if (sector === 'billing') {
      const issues = all(`SELECT b.id, c.email FROM billing_events b JOIN customers c ON b.customer_id = c.id WHERE b.event_type = 'payment_failed' AND b.resolved = 0`);
      return { success: true, verified: true, results: issues, message: `Found ${issues.length} failed payments.` };
    }

    return { success: false, message: 'Sector not supported for proactive scanning.' };
  },
}

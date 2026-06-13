
import { handleCustomerMessage } from './resolver.js'
import { proactiveTools, proactiveHandlers } from '../tools/proactive-triggers.js'

export async function handleProactiveOutreach(sector: string) {
  // 1. Scan for issues
  const scan = await proactiveHandlers.scan_for_critical_issues({ sector });
  
  if (!scan.results || scan.results.length === 0) return { status: 'no_issues' };

  const results = [];
  for (const issue of scan.results) {
    const email = issue.email;
    const context = `PROACTIVE TRIGGER: ${sector} issue detected. Details: ${JSON.stringify(issue)}`;
    
    // We use the existing resolver but inject a "System-Generated" message to trigger the agent
    const result = await handleCustomerMessage(
      email, 
      `[SYSTEM_PROMPT]: ${context}. Please reach out to the customer and resolve this proactively.`, 
      'proactive-outreach-' + Date.now()
    );
    
    results.push({ email, response: result.response, status: result.status });
  }
  
  return { status: 'completed', processed: results.length, details: results };
}

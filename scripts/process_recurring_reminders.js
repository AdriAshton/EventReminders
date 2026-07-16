import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: '.env.local' });

const logFilePath = path.join(__dirname, '..', 'logs', 'process_recurring_reminders.log');

function writeLog(message) {
  fs.mkdirSync(path.dirname(logFilePath), { recursive: true });
  fs.appendFileSync(logFilePath, `${new Date().toISOString()} ${message}\n`);
}

async function main() {
  const appUrl = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
  const jobSecret = process.env.JOB_SECRET;

  if (!jobSecret) {
    throw new Error('JOB_SECRET is not set');
  }

  writeLog(`Starting reminder job against ${appUrl}`);

  const response = await fetch(`${appUrl}/api/jobs/process-recurring-reminders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${jobSecret}`,
    },
  });

  const bodyText = await response.text();

  if (!response.ok) {
    writeLog(`Reminder job failed: ${response.status} ${response.statusText} ${bodyText}`);
    throw new Error(`Reminder job failed: ${response.status} ${response.statusText} ${bodyText}`);
  }

  writeLog(`Reminder job completed: ${bodyText || 'no response body'}`);
}

main().catch((error) => {
  writeLog(`Reminder job error: ${error.message || error}`);
  process.exit(1);
});
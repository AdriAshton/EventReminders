const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

async function main() {
  const appUrl = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
  const secret = process.env.JOB_SECRET;

  if (!secret) {
    throw new Error('JOB_SECRET is required');
  }

  const response = await fetch(`${appUrl}/api/jobs/process-recurring-reminders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
    },
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Reminder processor failed: ${text}`);
  }

  console.log(text);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Messaging Setup

### Twilio SMS and WhatsApp

If you want reminder delivery through SMS or WhatsApp, add these environment variables to `.env.local`:

```env
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_FROM_NUMBER=+15551234567
```

Use the full international phone format for client numbers and your Twilio sender number.

- Example client phone: `+15559876543`
- Example WhatsApp sender: `+14155238886`

For WhatsApp through Twilio, the app prefixes both the sender and recipient with `whatsapp:` internally.

If the Twilio variables are missing, the app will log the reminder payload instead of sending a message.

## Recurring Birthday Reminders

The app exposes a protected endpoint for processing yearly birthday reminders:

`POST /api/jobs/process-recurring-reminders`

Add this to your environment:

```env
JOB_SECRET=some-long-random-secret
```

Run it manually with:

```bash
npm run process-reminders
```

Example cron entry to run it every minute:

```cron
* * * * * cd /path/to/birthday-reminder && node ./scripts/process_recurring_reminders.js
```

If you are running the app on a hosted URL, the script will call that URL through `APP_URL`.

## Vercel Cron

The app is already configured for Vercel Cron in `vercel.json`:

- Path: `/api/jobs/process-recurring-reminders`
- Schedule: `* * * * *` (every minute)

To use it in production:

1. Deploy the app to Vercel.
2. Set `APP_URL` to your deployed URL.
3. Set `JOB_SECRET` in Vercel Environment Variables.
4. Keep `vercel.json` committed so Vercel registers the cron route.

The cron request is accepted either by the shared `JOB_SECRET` header or by Vercel's `x-vercel-cron` header.

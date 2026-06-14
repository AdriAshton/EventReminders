Password reset email setup

Environment variables (recommended):

- `APP_URL` - base app URL for links (default: http://localhost:3000)
- `EMAIL_FROM` - from address for sent emails

SendGrid option:
- `SENDGRID_API_KEY` - your SendGrid API key

SMTP option (Nodemailer):
- `SMTP_HOST` - SMTP server host
- `SMTP_PORT` - SMTP server port (defaults to 587)
- `SMTP_SECURE` - "true" to use TLS
- `SMTP_USER` - SMTP username
- `SMTP_PASS` - SMTP password

Behavior:
- If `SENDGRID_API_KEY` is set, the app will use SendGrid.
- Else, if `SMTP_HOST` and `SMTP_USER` are set, it will use SMTP via Nodemailer.
- Else, in development, the reset link will be logged and returned in the API response for troubleshooting.

Security:
- Do not return tokens in production responses. Keep tokens private and email the link only.
- Consider storing reset tokens in a dedicated table with audit information for production.

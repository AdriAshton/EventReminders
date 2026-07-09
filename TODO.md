# Project TODOs

- [x] Split Events into EventTypes + EventSettings
- [x] Dark mode / theme customization
- [x] Change password from login screen (with email confirmation)
- [x] Two-factor authentication (2FA)
- [ ] Update UI for user friendliness (dropdowns, templates, customizable message formats, undo delete, security screen)
- [x] Settings to toggle between dark mode and 2FA authentication
- [x] Email integration (SendGrid, Nodemailer) Using mailtrap for now
- [x] Configurable templates for personalized birthday messages
- [x] Messaging integrations (Twilio, SendGrid, Firebase)
- [x] Redirect when token expires

## Notes
- Use migrations to split tables safely; ensure data migration scripts are idempotent.
- Fixed `MessageAudit` delete logging via migration `008_fix_message_audit_delete.sql`.
- For email/SMS integrations, store provider config in environment vars and admin settings.
- Prioritize: security (password reset, 2FA) and messaging integrations.

-2fa should be in a seperate table

Confirm passwords when forgetting

Tie everything up with the reminders and Vercel Cron scheduling

SendGrid: has a free tier for low-volume testing (suitable for dev). Easy to set up and integrate.
Mailgun: offers a free trial/low-volume tier (limits and credit-based plans change often).
Amazon SES: effectively free/very cheap if you’re within AWS free-tier or sending from EC2/Lambda (otherwise extremely low cost per 1,000 sends).

- [ ] SMS integration (Twilio) (Only if they ask)
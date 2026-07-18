# Live database verification

- Verified the provided Neon production database connection reaches `neondb` as `neondb_owner`.
- Confirmed `company_settings` already includes the credential columns added by migration `019_add_company_settings_credentials.sql`.
- Confirmed the audit tables exist in the live schema as lowercase tables: `clientaudit`, `companyaudit`, `messageaudit`, `reminderaudit`, and `useraudit`.
- No migration history table was present in the live database, so applied migrations could not be enumerated directly.
- No live schema changes were made during verification.

# Work Done Log

Last updated: 2026-07-14

This file is a best-effort reconstruction of work completed in this project based on the current workspace state, package metadata, terminal context visible to Copilot, and uncommitted file changes. It separates verified facts from inferred history.

## Verified Current Project State

- Project type: Next.js app using the App Router.
- UI stack installed: React 19, React DOM 19, Material UI, Emotion.
- Backend/data-related packages installed: `pg`, `bcrypt`, `jsonwebtoken`.
- TypeScript and ESLint are configured.
- The app now includes both `app/` routes and legacy `pages/` routes for compatibility.
- The default `README.md` from `create-next-app` is still present.
- The project contains app routes for:
  - `app/api/auth`
  - `app/api/jobs`
  - `app/api/messages`
  - `app/clients`
  - `app/companies`
  - `app/dashboard`
  - `app/events`
  - `app/login`
  - `app/reminders`
  - `app/settings`
  - `app/signup`
  - `app/templates`
  - `app/uploads`
  - `app/users`
- The project contains API route folders for:
  - `app/api/clients`
  - `app/api/companies`
  - `app/api/events`
  - `app/api/jobs`
  - `app/api/messages`
  - `app/api/reminders`
  - `app/api/users`
- Service files currently present:
  - `services/auth.ts`
  - `services/clientService.ts`
  - `services/CompanyService.ts`
  - `services/eventService.ts`
  - `services/reminderServices.ts`
  - `services/testEndpoints.txt`
  - `services/userService.ts`

## Latest Session Updates

- Confirmed the Companies screen already renders an empty-state row with the message `No companies to display.` when the filtered list is empty.
- Marked the Companies empty-state checklist item as complete in `STD_Test_Checklist.md`.
- Connected to the local PostgreSQL database on `localhost:5432` using the `birthday_reminder` database.
- Verified the local `roles` table contains `Administrator`, `Staff`, and `Owner`.
- Updated the local `users` row for Adrian so it now points to the `Owner` role.
- Added a repository SQL update in `migrations/002_roles_seed.sql` so Adrian is promoted to `Owner` when the seed file is applied.

## Latest Work Added

- Fixed the recurring birthday reminder email path so it formats the event date before rendering the template and before building the fallback reminder text.
- Updated the template editor so uploaded images are included in the save payload and persist in `company_settings.messagetemplates`.
- Migrated the template image upload endpoint from local filesystem storage to Vercel Blob using `@vercel/blob`.
- Switched the upload flow from native server-side image processing to browser-side compression to avoid the Vercel Linux `sharp`/`libvips` runtime failure.
- Updated the upload route to use the connected public Blob store via `storeId: process.env.BLOB_PUBLIC_STORE_ID` and rely on Vercel OIDC instead of `BLOB_READ_WRITE_TOKEN`.
- Added `addRandomSuffix: true` to Blob uploads so template image filenames stay unique.
- Verified `npm run build` passes successfully after removing the native `sharp` dependency from the upload path.
- Confirmed the image upload route now returns the Blob URL instead of a local `/uploads/messages/...` path.
- Documented that the Blob store must be connected to the same Vercel project and that the public store uses `BLOB_PUBLIC_STORE_ID`.

- Updated the invite and email settings flows so they use company-scoped settings instead of asking the user to type tenant values manually.
- Added company-specific email credential storage to `company_settings` and created `migrations/019_add_company_settings_credentials.sql` for existing databases.
- Updated the email sender helper to use per-company SMTP/Gmail credentials first, with environment variables only as fallback.
- Updated the email settings screen to use authenticated requests and the invite screen to derive company context from the current session.
- Updated the clients page so create and edit dialogs both enforce required fields, and made birthdate rendering deterministic to avoid hydration mismatches.
- Updated the client filters so the dropdowns cascade one another instead of working independently.
- Updated the email settings back button so it now routes to the dashboard.

- Confirmed and documented the recurring reminders job flow under `app/api/jobs/process-recurring-reminders` and `app/api/jobs/trigger-recurring-reminders`.
- Confirmed the settings area now includes a dedicated `app/settings/2fa` subpage alongside the main settings screen.
- Confirmed auth routing now includes `login`, `signup`, `forgot`, and `reset` flows under `app/api/auth` and the matching app pages.
- Confirmed the messages surface has an API route at `app/api/messages/route.ts` and a matching message list/detail UI under `app/messages`.
- Added a company onboarding doc at `COMPANY_ONBOARDING.md` describing the owner / invite / setup flow in one place.
- Added a dedicated invite screen at `app/users/invites/page.tsx` and linked it from the dashboard setup card.
- Added `services/companyInviteService.ts` to call the invite API from the UI.
- Added a bootstrap SQL file and script for the invite tables: `migrations/016_bootstrap_company_invites.sql` and `scripts/bootstrap_company_invites.js`.
- Successfully connected to the configured Neon database via `DATABASE_URL` and created the missing `company_invites` / `company_onboarding_profiles` tables with the bootstrap script.
- Fixed the `/signup` page TypeScript and App Router suspense issue so `npm run build` completes successfully.

## Verified Changes From This Session

- `app/api/jobs/process-recurring-reminders/route.ts`
  - Formats `eventDate` before rendering the template.
  - Uses the formatted date in the fallback birthday message.
- `app/templates/page.tsx`
  - Sends `imageUrl` when saving a template.
- `app/api/uploads/route.ts`
  - Uploads images to Vercel Blob with `put(...)`.
  - Uses `storeId: process.env.BLOB_PUBLIC_STORE_ID` so the public store connection is selected explicitly.
  - Uses `addRandomSuffix: true` to avoid filename collisions.
  - Returns `blob.url` instead of a local filesystem path.
  - Includes temporary console logging for upload-stage debugging.
- `lib/imageCompression.ts`
  - Adds browser-side image compression so uploads do not depend on native server image processing.
- `services/messageService.ts`
  - Compresses image files before uploading them to the Blob route.
- `package.json`
  - Added `@vercel/blob`.
  - Removed `sharp` after moving image processing to the browser.
- Validation
  - `npm run build` passed successfully after fixing the Blob dependency and removing the invalid debug log field.

## Verified Installed Packages

From `package.json`:

### Dependencies
- `@emotion/react`
- `@emotion/styled`
- `@mui/material`
- `bcrypt`
- `jsonwebtoken`
- `next`
- `pg`
- `react`
- `react-dom`

### Dev Dependencies
- `@tailwindcss/postcss`
- `@types/bcrypt`
- `@types/jsonwebtoken`
- `@types/node`
- `@types/pg`
- `@types/react`
- `@types/react-dom`
- `eslint`
- `eslint-config-next`
- `tailwindcss`
- `typescript`

## Software Tools Used

The application was built with these verified tools and services:

- Next.js 16 with the App Router and legacy `pages/` support.
- React 19 and React DOM 19.
- TypeScript and ESLint.
- Material UI and Emotion for the UI layer.
- Neon PostgreSQL via the `pg` client.
- JWT authentication via `jsonwebtoken`.
- Password hashing via `bcrypt`.
- Email tooling via `nodemailer` and `@sendgrid/mail`.
- Spreadsheet import support via `xlsx`.
- Browser-side image compression via the DOM canvas/image APIs.
- TOTP/2FA support via `speakeasy`.
- File watching for rebuilds via `chokidar-cli`.
- Local environment loading via `dotenv`.
- Vercel for deployment and build hosting.
- Migration and reminder runner scripts in `scripts/run_migrations.js` and `scripts/process_recurring_reminders.js`.
- Development and validation commands observed in this session: `npm install`, `npm run start`, `npm run build`, `npm run lint`, and `npx tsc --noEmit`.

## Verified Terminal Commands Observed In This Session

The following commands were visible in terminal/session context during this chat:

- `npm install --save-dev @types/react @types/react-dom`
- `npm run start`

Additional command attempted by Copilot during debugging:

- `npx tsc --noEmit`
  - This prompted to install `tsc@2.0.4` instead of running the local TypeScript compiler directly.

## Verified File Changes Currently Uncommitted

From `git status --short` inside the project:

### Modified
- `app/clients/page.tsx`
- `app/dashboard/page.tsx`
- `services/clientService.ts`
- `services/eventService.ts`
- `services/reminderServices.ts`

### Untracked / newly added
- `app/api/companies/`
- `app/login/`
- `app/signup/`
- `services/CompanyService.ts`
- `services/auth.ts`

## Verified Functional Areas Built So Far

### Authentication
- `app/login/page.tsx` exists and includes a login form.
- `app/signup/page.tsx` exists and includes a signup form.
- `services/auth.ts` exists, which strongly indicates auth API integration work has started.
- The login page stores a token in `localStorage` and redirects to `/dashboard`.

### Clients
- `app/clients/page.tsx` exists and includes:
  - client table rendering
  - add client form
  - edit client form
  - delete action
  - service integration through `services/clientService.ts`
- `services/clientService.ts` includes `getClients`, `addClient`, `updateClient`, and `deleteClient`.
- Client requests include a bearer token from `localStorage`.

### Companies
- `app/api/companies/` exists.
- `services/CompanyService.ts` exists.
- This strongly indicates company CRUD or lookup work has started.
- The invite workflow now includes `app/api/company-invites/route.ts` and a UI entry at `app/users/invites/page.tsx`.
- The dashboard now includes a `Send Invite` button that points to `/users/invites`.

### Events and Reminders
- `services/eventService.ts` and `services/reminderServices.ts` are modified.
- API folders for `events` and `reminders` exist.
- App pages for `events` and `reminders` exist.
- This indicates event/reminder flows are in active development.

### Onboarding and invite database support
- Added `company_invites` and `company_onboarding_profiles` support through `migrations/016_bootstrap_company_invites.sql`.
- Added a one-off database bootstrap script at `scripts/bootstrap_company_invites.js` to apply the new invite tables directly against `DATABASE_URL`.


### Users
- `app/api/users/` exists.
- `services/userService.ts` exists.
- `app/users/page.tsx` exists.
- The users flow includes company-scoped CRUD operations and password hashing in the API route.
- The users page includes a dedicated change-password flow with `New Password` and `Confirm Password` fields during edit.

## Verified Fixes Made During This Chat

### Theme, login, and dashboard UX
- Replaced the old binary theme toggle with a dropdown in `app/settings/page.tsx` that supports `Purple`, `Red`, and `Green`.
- Updated `app/components/ThemeProviderClient.tsx` so the selected theme color drives the palette and page background.
- Removed the old authenticated theme write-back that was causing redirect-like behavior when changing theme colors.
- Updated `app/dashboard/page.tsx` so the hero banner and action buttons use the active theme palette and stand out more clearly.
- Changed the dashboard identity label to uppercase display text while leaving the stored username unchanged.
- Updated the login screen 2FA action copy to friendlier wording and added a hover highlight for the forgot-password link.

### Security and 2FA
- Split 2FA into user-level controls only.
- Added `/api/auth/2fa/disable` so a signed-in user can disable 2FA for their own account.
- Removed the admin-wide 2FA enforcement UI and routes.
- Updated the settings screen so regular users only see the `My account` 2FA controls.
- Gated the `Security settings` tab so only administrators can see it.
- Updated login so it checks only the user’s own 2FA state.

### Date display and privacy
- Standardized visible date rendering to `mm-dd-yyyy` across dashboard, event, reminder, and birthday template preview surfaces.
- Masked client email and phone values in the client list and client detail page while leaving edit/import fields intact.

### Reliability and fallback pages
- Added a minimal `pages/500.tsx` fallback so Next generates the `/500` static asset and no longer errors on missing `500.html`.

### `app/clients/page.tsx`
A Material UI typing issue was investigated and the current file shows the correct direction for the installed MUI version:

- Earlier code used `InputProps` and `InputLabelProps` on `TextField`.
- The installed package version is `@mui/material@^9.1.0`.
- The current `clients` page now uses `slotProps` instead of `InputProps` / `InputLabelProps`.
- That change aligns with newer MUI APIs and explains why the old props caused the error.
- The file also now uses controlled values for the add form inputs and resets the form after a successful add.
- The delete and edit buttons stop row click propagation, which avoids accidental row selection while clicking actions.

### Birthday reminders, migrations, and clients UI refresh
- Added `Birthdate` as the source of truth for birthday reminders and removed the old event/event-type flow from the app.
- Created migration `migrations/010_clients_birthdays_remove_events.sql` to backfill client birthdays, make `Birthdate` required, convert reminders to `ClientId`, and remove the old event tables.
- Added migration `migrations/011_drop_clientaudit_client_fk.sql` and updated the audit schema so deleting a client no longer fails on the `ClientAudit` foreign key.
- Updated `scripts/run_migrations.js` to load `.env.local` / `.env` automatically, which lets `npm run migrate` work from the project root.
- Set the local `DATABASE_URL` in `.env.local` to `postgres://postgres:password@localhost:5432/birthday_reminder`.
- Verified the migration runner completes successfully against the local database.
- Removed the birthday-day filter from the clients screen after it was requested back out.
- Moved the add-client form into a popup dialog and placed an `Add` action beside `View` in each row.
- Made the add/edit dialogs opaque and fixed the birthday field readability inside the popup.
- Updated the clients pagination styling so the selected page matches the active theme color and the bottom paginator is more visible.
- Confirmed the clients page and the full project build validate successfully after the UI and migration changes.

## Inferred Project History

These items are likely true based on the repo state, but they are not fully proven from chat-visible history alone:

- The project was probably scaffolded with `create-next-app` and then expanded manually.
- Material UI and Emotion were likely added after the initial scaffold.
- PostgreSQL access was likely added through `pg`.
- JWT-based auth and password hashing were likely introduced using `jsonwebtoken` and `bcrypt`.
- Type packages were added incrementally as TypeScript errors appeared.
- Login and signup pages appear to have been created after the initial scaffold because they are currently untracked in git.
- `services/CompanyService.ts` and `app/api/companies/` also appear to be newly added and not yet committed.

## Best-Effort Timeline

1. A Next.js TypeScript project was created.
2. Core app structure was expanded to include authentication, clients, dashboard, events, reminders, and API routes.
3. Material UI and Emotion were installed for UI components.
4. PostgreSQL, JWT, and bcrypt-related dependencies were installed for backend/auth work.
5. Service modules were created for auth, clients, companies, events, and reminders.
6. Login and signup pages were added.
7. Client CRUD UI and service integration were added.
8. Type packages for React and React DOM were installed during this session.
9. A `TextField` typing issue was debugged on the clients page, and the styling props were updated toward `slotProps`.

## Limits Of This Log

I cannot fully recover:

- every command ever typed before this chat session
- exact creation timestamps for files
- every package installation command used historically
- exact user prompts from earlier sessions not present in this conversation

This log is therefore a reconstruction from the current codebase and visible session context, not a complete audit trail.

## Change Log

 
### 2026-06-14

#### Audit logging & schema

### 2026-06-30

### 2026-07-10
- Fixed company email-provider selection failure caused by missing `company_settings` columns (`emailfrom`, `smtp_host`, `smtp_port`, `smtp_secure`, `smtp_user`, `smtp_pass`, `gmail_user`, `gmail_pass`).
- Added runtime schema safety in `lib/appSettings.ts` so missing credential columns are automatically ensured before settings reads/writes.
- Applied migration `migrations/019_add_company_settings_credentials.sql` to the live database and verified columns exist.
- Added a test-email feature on the email provider screen:
  - UI updates in `app/settings/email/page.tsx`.
  - New authenticated API endpoint `app/api/settings/email-provider/test/route.ts`.
- Fixed invite emails using the wrong provider by passing company context to email sending in `app/api/company-invites/route.ts`.
- Hid reminder-delivery settings UX for now by removing reminder-delivery controls from `app/settings/page.tsx`.
- Updated settings/templates API usage to use authenticated fetch on `app/templates/page.tsx` to resolve Unauthorized errors.
- Dashboard/UI cleanup updates:
  - Removed redundant settings action under setup/security card.
  - Removed Recent Activity block.
  - Changed dashboard summary language to show `Emails Sent (Last 7 Days)`.
  - Moved back-button placement on invite/email settings screens.
  - Redesigned `app/users/invites/page.tsx` for cleaner layout and wider invite-email input.
- Clients page enhancements in `app/clients/page.tsx`:
  - Added Download Template button and XLSX template export.
  - Removed birthdate filter.
  - Populated first/last-name filter values from table data endpoints.
  - Changed filter behavior to explicit `Apply Filters` and `Clear` workflow using draft selections.
- Fixed cron relay URL resolution in production by hardening APP_URL handling:
  - `app/api/cron/send-reminders/route.ts`
  - `app/api/jobs/trigger-recurring-reminders/route.ts`
  - Localhost/127.0.0.1 APP_URL is now ignored in hosted runtime and request origin is used.
- Added temporary deep diagnostics for cron troubleshooting:
  - Request-start and downstream-response logs in relay routes.
  - try/catch around relay fetch calls with debug payload on failure.
  - Top-level error logging in `app/api/jobs/process-recurring-reminders/route.ts`.
- Fixed DB trigger/function drift that caused `ClientAudit.companyid` null insert errors:
  - Added `migrations/020_fix_clientaudit_trigger_companyid.sql`.
  - Recreated `log_client_changes()` and trigger to always include `CompanyId`.
  - Validated with insert smoke-test and table/column checks.
- Hardened recurring processor so one bad reminder does not crash the whole run:
  - Added per-reminder error isolation and failed counters in `app/api/jobs/process-recurring-reminders/route.ts`.
  - Added method/recipient validation guards per channel.
- Fixed recurring email provider resolution by passing `companyid` into `sendEmail` from `app/api/jobs/process-recurring-reminders/route.ts`.
- Fixed production build error in `lib/appSettings.ts` (`normalizeTemplates` null/undefined type mismatch) and revalidated successful builds.
- Confirmed Vercel cron health from logs after deployment:
  - `/api/cron/send-reminders` now resolves and calls downstream successfully with `status: 200`.
- Executed direct SQL verification/tests against live database:
  - Inserted a due reminder row for cron testing.
  - Queried due reminders and confirmed due rows were present.
  - Triggered manual processor endpoint and validated processed/failed response paths.

### 2026-07-09
- Added a per-company email credential migration for `company_settings`.
- Updated the email settings UI to save `From Email`, SMTP, and Gmail credentials per company on the existing email provider screen.
- Updated the invite flow to use company context from the signed-in session and show the company name in the invite history.
- Updated the client add/edit forms so all fields are mandatory and the edit form matches the create form requirements.
- Updated the clients table birthdate display to use a deterministic format and prevent hydration warnings.
- Updated the client filters so each dropdown cascades based on the other selected values.
- Updated the email settings back button to navigate to the dashboard.

### 2026-07-07
- Added the company onboarding document `COMPANY_ONBOARDING.md` with a step-by-step outline of the owner / invite / account setup flow.
- Added an admin invite screen at `app/users/invites/page.tsx` and a dashboard shortcut in `app/dashboard/page.tsx`.
- Added invite API support in `app/api/company-invites/route.ts` plus a UI service helper in `services/companyInviteService.ts`.
- Added `migrations/016_bootstrap_company_invites.sql` and `scripts/bootstrap_company_invites.js` to create the missing invite/onboarding tables directly in the database.
- Ran the bootstrap script successfully against the configured Neon database, which created `company_invites`.
- Fixed the `/signup` page suspense / TypeScript issue and verified `npm run build` passes.

#### Recurring reminders, cron, and time handling

- Added Vercel Cron configuration in `vercel.json` to run `/api/jobs/process-recurring-reminders` every minute.
- Added the manual admin trigger route `app/api/jobs/trigger-recurring-reminders/route.ts` and the dashboard button to invoke it.
- Updated the recurring reminder processor so due reminders are selected from stored `nextrunat` directly.
- Switched reminder scheduling and display logic to use local time consistently instead of forcing UTC ISO formatting in the UI.
- Updated the reminders page to display schedule times in local time.
- Confirmed the scheduler processes due reminders and sends email successfully when the row is actually due.
- Verified the app builds successfully after the cron and local-time changes.
- Pushed the changes to the Git remote on branch `feature/audit-2fa-session`.
- Confirmed the repository was pushed to GitHub and noted the remote move notice to `https://github.com/AdriAshton/EventReminders.git`.
- Fixed `MessageAudit` delete logging which caused `DELETE /api/messages` to fail due to a foreign-key violation. Added migration `migrations/008_fix_message_audit_delete.sql` to drop legacy FK constraints (`fk_message`, `fk_message_audit_message`) and updated the audit table definitions in the main schema files so deletes no longer fail.

#### Session & auth UX
- Implemented centralized client auth helpers in `lib/authClient.ts` to: read/store JWT, detect expiry, sync token into a cookie for middleware, expose `authenticatedFetch()` and `ensureValidSession()` helpers.
- Added `app/components/AuthSessionManager.tsx` and wired it into `app/layout.tsx` to proactively validate session state on page load/visibility/focus and redirect expired sessions to `/login?reason=expired`.
- Updated `app/login/page.tsx` to use `setStoredToken()` and `clearStoredToken()` on login/logout so the middleware and client helpers stay in sync.

#### Services and middleware
- Refactored many frontend service modules (`services/*`) to use `authenticatedFetch()` instead of manual `localStorage` header plumbing. This centralizes 401 handling and ensures expired tokens cause redirects.
- Expanded and tightened `proxy.ts` matcher and redirect behavior so protected pages now redirect to `/login?reason=expired` when the middleware detects missing/expired JWT.

#### Project TODOs
- Marked `Redirect when token expires` as completed in `TODO.md`.

#### Verification
- Rebuilt the project (`npm run build`) successfully after changes and validated the message delete flow end-to-end against the local DB after applying the migration.


#### Two-Factor Authentication (2FA)
- Implemented TOTP-based 2FA backend endpoints:
  - `POST /api/auth/2fa/setup` — generates a TOTP secret using `speakeasy`, stores it as `users.settings.twoFactor.pending`, and returns `base32` and `otpauth_url`.
  - `POST /api/auth/2fa/verify` — verifies a provided token and, on success, moves the pending secret to `users.settings.twoFactor.enabled`.
- Added a client-side test page at `/settings/2fa`:
  - UI lets you enter a `userId` (for testing), generate a secret, view `base32` and `otpauth_url`, and submit a code to verify and enable 2FA.
  - Inputs are plain visible textboxes to simplify testing (QR rendering optional future work).
- Added a minimal TypeScript declaration shim `types/speakeasy.d.ts` so the build treats `speakeasy` as `any` and type-checking passes.

#### Email & Password Reset
- Implemented password reset endpoints using SendGrid primary, nodemailer SMTP fallback, and safe dev fallbacks:
  - `app/api/auth/forgot/route.ts` generates a reset token, stores it in `users.settings.passwordReset`, attempts SendGrid or SMTP delivery, and always returns a generic message to callers (no token returned in responses).
- Removed developer `test-send.js` helper to avoid accidental spamming of test providers.
- Investigated and documented Mailtrap behavior:
  - Observed SMTP error `550 5.7.0 Too many emails per second` — Mailtrap/testing plans rate-limit or disallow external relay.
  - Recommendation: use SendGrid/Mailgun/SES for external delivery or upgrade Mailtrap plan; for dev keep Mailtrap as a capture-only service.

#### Build & Fixes
- Fixed parse error in `app/api/auth/2fa/setup/route.ts` by correcting SQL string quoting.
- Fixed incorrect relative `pool` imports by switching to the project alias `@/lib/db` for the new 2FA routes.
- Added `types/speakeasy.d.ts` to silence TypeScript implicit-any errors for `speakeasy`.

#### Questions asked & answers provided during work
- Q: Why did SMTP return `550 Too many emails per second`? — A: Provider (Mailtrap) rate-limited or disallowed relay for that plan.
- Q: Do I have to pay for SendGrid? — A: No; SendGrid has a free tier suitable for low-volume testing, but production/scale requires paid plans.
- Q: Which provider is best (SendGrid/SES/Mailgun)? — A: Guidance provided: SendGrid for quick integration, SES for low cost/scale, Mailgun for developer-friendly API.
- Q: Which provider can I use free now? — A: All three offer low-volume/free options; SendGrid recommended for fastest setup.

#### Next recommended actions
- Wire 2FA endpoints to use existing JWT auth so the logged-in user doesn't need to pass `userId` in requests (security improvement).
- Render QR image in the `/settings/2fa` UI for easier authenticator setup.
- Add encrypted storage for TOTP secrets and recovery codes.
- For email in production: configure SendGrid (or SES) with verified sender and appropriate env vars; keep Mailtrap for dev-only captures.

#### Dependencies and environment
- Installed `@types/react` and `@types/react-dom` as dev dependencies.

#### Documentation
- Created `workdone.md` to capture project history, installed packages, observed commands, verified file changes, and inferred project progress.

#### UI and page formatting
- Updated `app/clients/page.tsx` to use MUI `slotProps` instead of `InputProps` and `InputLabelProps` for `TextField` styling compatibility.
- Updated `app/clients/page.tsx` to use controlled fields, improved form reset behavior, and prevented row click conflicts on action buttons.
- Reformatted `app/events/page.tsx` to match the `clients` page structure using MUI layout, table, and form components.
- Reformatted `app/reminders/page.tsx` to match the `clients` and `events` page structure using MUI layout, table, and form components.
- Created `app/companies/page.tsx` in the same CRUD/table layout style as `app/clients/page.tsx`.
- Connected `app/companies/page.tsx` to `services/CompanyService.ts` using the company fields `companyname`, `contactemail`, and `contactphone`.
- Validated the new `companies` page after creation with no file-level errors.
- Created `app/users/page.tsx` in the same CRUD/table layout style as `app/clients/page.tsx`.
- Connected `app/users/page.tsx` to `services/userService.ts` using the user fields `username`, `email`, `role`, and `password`.
- Updated `app/users/page.tsx` to add a `Change Password` button that reveals `New Password` and `Confirm Password` fields in the edit form.
- Added client-side validation in `app/users/page.tsx` to require a new password and confirm that both password fields match before saving.
- Updated `app/dashboard/page.tsx` to add `Users` and `Companies` cards so those pages can be reached directly from the dashboard.
- Updated the dashboard grid to use MUI Grid v2 sizing syntax with `size={{ xs: 12, md: 4 }}` instead of `item xs={12} md={4}`.
- Added `Back` buttons to `app/events/page.tsx`, `app/clients/page.tsx`, `app/companies/page.tsx`, `app/reminders/page.tsx`, and `app/users/page.tsx` to navigate back to `/dashboard`.
- Added confirmation dialogs to all delete actions across CRUD pages (`clients`, `events`, `companies`, `reminders`, `users`) to prevent accidental deletes.
- Added bottom-center toast notifications (MUI `Snackbar` + `Alert`) for successful create/update/delete operations on `clients`, `events`, `companies`, `reminders`, and `users` pages. Toasts auto-hide after 3s.
 - Added single-record detail pages and API/service support for `clients`, `events`, and `reminders`:
   - API: support `GET /api/clients?id=...`, `GET /api/events?id=...`, `GET /api/reminders?id=...` to fetch a single record scoped to the caller's company.
   - Services: added `getClient(clientid)`, `getEvent(eventid)`, and `getReminder(reminderid)` to their respective service files.
   - UI: added dynamic detail pages at `app/clients/[id]/page.tsx`, `app/events/[id]/page.tsx`, and `app/reminders/[id]/page.tsx` with loading, error handling, and Back buttons.
- Replaced `useSearchParams()` usage on `app/clients/page.tsx` with a client-only `URLSearchParams(window.location.search)` lookup to avoid a Suspense/prerender error during build.
- Re-ran `npm run build` and validated the app builds successfully; dynamic routes for the new detail pages are present in the build output.

#### API and service additions
- Created `app/api/users/route.ts` with company-scoped `GET`, `POST`, `PUT`, and `DELETE` handlers.
- Implemented password hashing in `app/api/users/route.ts` for user creation and optional password updates.
- Created `services/userService.ts` for frontend CRUD requests to `/api/users`.

#### Validation
- Validated `app/api/users/route.ts`, `services/userService.ts`, and `app/users/page.tsx` with no file-level errors.
- Revalidated `app/users/page.tsx` after the password-change UI update with no file-level errors.
- Validated `app/events/page.tsx`, `app/clients/page.tsx`, `app/companies/page.tsx`, `app/reminders/page.tsx`, and `app/users/page.tsx` after adding dashboard back buttons with no file-level errors.
 - Validated `app/events/page.tsx`, `app/clients/page.tsx`, `app/companies/page.tsx`, `app/reminders/page.tsx`, and `app/users/page.tsx` after adding delete confirmations and toast notifications with no file-level errors.

#### Verified commands seen in this session
- Ran `npm install --save-dev @types/react @types/react-dom`.
- Ran `npm run start`.
- Attempted `npx tsc --noEmit` during TypeScript debugging.
- Ran `npm run build` successfully.

## Suggested Ongoing Use

Append new entries below this section whenever work is done.

### 2026-06-29

#### Recent work since the last update
- Updated the work log to reflect the current app surface, including the active `clients`, `companies`, `events`, `reminders`, `messages`, `users`, `login`, `signup`, and `settings` areas under the Next.js App Router.
- Confirmed the supporting service layer still centers on `auth`, `clientService`, `CompanyService`, `messageService`, `reminderServices`, and `userService`.
- Rechecked the project TODOs and kept the remaining open UI work focused on user-friendliness improvements such as dropdowns, templates, customizable message formats, undo delete, and the security screen.
- Preserved the existing build-history notes so the log still reflects the last verified successful project state.

#### Documentation status
- This log has been left as a best-effort reconstruction and should continue to be appended with short dated entries as new work is completed.

## Change Log

### 2026-06-11

#### Dependencies and environment
- Installed `xlsx` to support `.xls` and `.xlsx` file import on the clients page.
- Observed that `npm run dev` fails when run from the parent folder instead of the `birthday-reminder` project folder; confirmed the correct working directory is required.
- Confirmed `npm run build` succeeds after the changes made in this session.

#### Clients page
- Added server-backed pagination to `app/clients/page.tsx`.
- Added page state, total count state, and page-size state to the clients UI.
- Added visible pagination controls using MUI `Pagination`.
- Added a rows-per-page selector with options `5`, `10`, and `25`.
- Moved pagination and rows controls above the table for better visibility.
- Applied high-contrast pagination styling so controls remain visible on the dark background.
- Added click-through navigation from client rows to the client detail page.
- Added an explicit `View` button alongside `Edit` and `Delete`.
- Added an `Import` button to the clients page.
- Added file input support for `.csv`, `.txt`, `.xls`, and `.xlsx` on the clients page.
- Implemented CSV/text import parsing for clients.
- Implemented Excel import for clients using `xlsx` by converting the first worksheet to CSV.
- Added sequential client import using `addClient(...)` per parsed row.
- Added import validation for required columns: `firstname`, `lastname`, `email`, `phone`, `companyid`.
- Added import summary toast after import completes.
- Added import error collection and a popup dialog to display failed rows, reasons, and raw row data.
- Fixed a build error on the clients page by importing MUI `Dialog`, `DialogTitle`, `DialogContent`, and `DialogActions`.

#### Clients API and service
- Updated `app/api/clients/route.ts` to support paginated `GET` responses with `?page=` and `?pageSize=`.
- Updated the clients API to return `{ rows, total }` for paginated list requests.
- Updated `services/clientService.ts` so `getClients(page, pageSize)` requests the paginated API.

#### Events page
- Added server-backed pagination to `app/events/page.tsx`.
- Added rows-per-page selector and visible pagination controls above the table.
- Added click-through navigation from event rows to the event detail page.
- Added an explicit `View` button alongside `Edit` and `Delete`.
- Added a simple `Import` button and file picker to the events page.
- Added basic file reading for event imports with toast feedback showing detected row count.

#### Events API and service
- Updated `app/api/events/route.ts` to support paginated `GET` responses with `?page=` and `?pageSize=`.
- Updated `services/eventService.ts` so `getEvents(page, pageSize)` requests the paginated API.

#### Reminders page
- Added server-backed pagination to `app/reminders/page.tsx`.
- Added rows-per-page selector and visible pagination controls above the table.
- Added click-through navigation from reminder rows to the reminder detail page.
- Added an explicit `View` button alongside `Edit` and `Delete`.
- Added a simple `Import` button and file picker to the reminders page.
- Added basic file reading for reminder imports with toast feedback showing detected row count.

#### Reminders API and service
- Updated `app/api/reminders/route.ts` to support paginated `GET` responses with `?page=` and `?pageSize=`.
- Updated `services/reminderServices.ts` so `getReminders(page, pageSize)` requests the paginated API.

#### Messages feature
- Created a new `messages` module following the same CRUD structure as the existing `clients` flow.
- Created `app/api/messages/route.ts` with company-scoped `GET`, `POST`, `PUT`, and `DELETE` handlers.
- Added paginated `GET` support to the messages API and single-record fetch with `?id=`.
- Created `services/messageService.ts` with `getMessages`, `getMessage`, `addMessage`, `updateMessage`, and `deleteMessage`.
- Created `app/messages/page.tsx` with:
  - paginated list view
  - add form
  - edit form
  - delete action
  - rows-per-page selector
  - pagination controls
- Created `app/messages/[id]/page.tsx` detail page with loading and error handling.
- Added click-through navigation from message rows to the message detail page.
- Added an explicit `View` button to the messages list page.

#### Dashboard
- Added a new `Messages` card/button to `app/dashboard/page.tsx` linking to `/messages`.

#### Database/schema work discussed
- Reviewed the relationship between `events`, `reminders`, and outbound communication content.
- Recommended storing sendable content separately from event scheduling.
- Generated a PostgreSQL `Messages` table design linked to `Reminders` and `Companies`.
- Used the created `Messages` table shape to build the frontend and API files.

#### Commands run and observed during this session
- `git push -u origin eventreminders`
- `npm run dev` (attempted from wrong folder and failed)
- `cd "birthday-reminder"; npm run dev`
- `npm run build`
- `cd "birthday-reminder"; npm install xlsx`
- `git push -u origin main`

#### Validation
- Validated the newly created `messages` files (`page`, `[id]`, `route`, and `service`) with no file-level errors.
- Validated `app/dashboard/page.tsx` after adding the `Messages` navigation card with no file-level errors.
- Validated updated list pages for `clients`, `events`, `reminders`, and `messages` after adding click-through navigation with no file-level errors.
- Confirmed build success after resolving the missing MUI dialog imports and adding `xlsx`.

#### Notes and implementation details
- Client import currently supports real processing; event and reminder imports currently only read files and show row counts, they do not yet create records.
- Client import expects header names in lowercase-equivalent CSV form: `firstname,lastname,email,phone,companyid`.
- Excel import currently reads only the first worksheet.
- Import parsing is simple comma-splitting and does not yet handle quoted commas or more advanced CSV edge cases.
- The messages page assumes the PostgreSQL `Messages` table exists and uses column names matching the schema created in `Company Schema(Core Tables).sql`.
- Production `npm run start` requires a successful `npm run build` first because Next.js needs the `.next` output.
- `npm run dev` must be run from the `birthday-reminder` folder because that is where `package.json` lives.

### Entry Template
- Date:
- Task requested:
- Files created:
- Files modified:
- Packages installed:
- Commands run:
- Notes:

## Change Log

### 2026-06-11

#### Dashboard and navigation
- Added a dedicated `Setup/Security` dashboard card.
- Moved `Companies` and `Users` links into the `Setup/Security` card.
- Removed the standalone `Users` card from the dashboard.
- Removed the duplicate `Messages` card so the dashboard only shows one `Messages` section.
- Added a dashboard visibility guard so `Setup/Security` only renders for `Administrator` users.
- Kept the existing operational cards visible for all authenticated users.

#### RBAC / roles work
- Confirmed the desired role names are `Administrator` and `Staff`.
- Recommended creating a `roles` table instead of keeping free-text roles in `users`.
- Explained how to connect `Roles` to `Users` with `Users.RoleId` as a foreign key.
- Rewrote the database design so `Users` stores `RoleId` instead of `Role`.
- Added a PostgreSQL migration script to:
  - create and seed `Roles`
  - add `Users.RoleId`
  - backfill existing users from the old `Role` column
  - set `RoleId` to `NOT NULL`
  - drop the old `Role` column
- Created a standalone seed file for roles: `migrations/002_roles_seed.sql`.
- Created a standalone migration file for the user role transition: `migrations/001_roles_users_migration.sql`.
- Seeded the `Administrator` and `Staff` role rows with descriptions.
- Updated the users API to read and write `roleid` and join to `roles` when returning user rows.
- Updated signup so new users default to the `Staff` role by looking up `Roles.RoleId`.
- Updated login so the JWT includes the joined role name from the `Roles` table.
- Updated `services/userService.ts` so create and update requests send `roleid`.
- Updated `app/users/page.tsx` so users can insert and update roles using a dropdown tied to `roleid`.
- Normalized loaded user rows so both `role` and `roleid` values open correctly in the edit form.

#### Role/data questions answered in this thread
- Confirmed that a roles table is the better approach for a real app.
- Explained that `RoleId` should replace the text `Role` column in `Users`.
- Showed how to join `Users` to `Roles` with a SQL `JOIN`.
- Clarified that the password hash cannot be recovered from an existing stored hash.
- Explained that `test@example.com` only works if the row exists in the same database the app is connected to.
- Provided PostgreSQL update examples for changing `Users.RoleId` to `1` for a specific user.
- Provided a sample one-row seed insert for an admin user using `PasswordHash`.

#### Recent validations performed
- Ran `npm run build` successfully after the dashboard card changes.
- Ran `npm run build` successfully after the admin-only dashboard guard was added.
- Ran `npm run build` successfully after the users page role-edit changes.

#### Notes
- The users page currently uses a simple hardcoded role option mapping of `1 = Administrator` and `2 = Staff`.
- The app now expects `Roles` to exist before inserting or updating users with `RoleId`.
- The dashboard security card is presentation-only guard logic; direct route protection can still be added separately.

### 2026-06-12

#### EventTypes normalization and UI
- Added idempotent SQL migration to normalize `EventType` into an `EventTypes` table and update `Events.EventTypeId` references (`migrations/006_eventtypes_migration.sql` and related migrations).
- Implemented a Node migration runner and `npm run migrate` script to apply migrations safely.
- Added `services/eventTypeService.ts` with `getEventTypes`, `addEventType`, `updateEventType`, and `deleteEventType` functions.
- Created API route `app/api/event-types/route.ts` for company-scoped CRUD and updated `app/api/events/route.ts` to validate that `eventtypeid` belongs to the caller's company.
- Implemented a client-side CRUD page at `app/events/event-types/page.tsx` and added an `Event Types` button to the events card on `app/dashboard/page.tsx` linking to `/events/event-types`.

#### Build & runtime notes
- Ran `npm run build` after changes; TypeScript and page generation succeed.
- Observed a non-blocking parse warning during page-data collection: `TypeError: Failed to parse URL from /api/event-types` (ERR_INVALID_URL). Investigation pending; build is otherwise successful.

#### Project tracking
- Created `TODO.md` at project root with requested feature list (dark mode, 2FA, email/SMS integrations, templates, UI improvements, etc.).
- Updated the in-repo TODO list via the assistant-managed todo tracker.

#### Next recommended steps
- Run the migration runner against a development database (set `DATABASE_URL`) to apply new schema and verify data.
- Investigate and fix the `/api/event-types` parse warning (likely caused by `new URL()` with a relative path in code that runs during SSR).
- Proceed with one TODO item (please indicate priority).

Log updated by assistant on 2026-06-12.

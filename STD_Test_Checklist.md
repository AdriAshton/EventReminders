# STD Test Checklist

Use this file to track manual testing as you go through each screen in the app.

## Login
- [x] Open the login page
- [x] Log in with a valid administrator account
- [x] Confirm you land on the dashboard
- [x] Confirm a bad login shows an error
- [x] Confirm expired sessions redirect to login

## Dashboard
- [x] Confirm dashboard loads without errors
- [x] Confirm client, message, and reminder cards load
- [x] Confirm loading indicator appears while data is fetching
- [x] Confirm empty states show when there is no data
- [x] Confirm navigation buttons work

## Clients
- [x] Open the clients screen
- [x] Confirm the table loads
- [x] Confirm loading indicator shows while fetching
- [x] Confirm empty state shows when no clients exist
- [x] Confirm add client works
- [x] Confirm edit client works
- [x] Confirm delete client works
- [x] Confirm filters work
- [x] Confirm pagination works
- [x] Confirm import template download works
- [x] Confirm import file upload works

## Companies
- [x] Open the companies screen
- [x] Confirm only administrator/owner access is allowed
- [x] Confirm loading indicator shows while fetching
- [x] Confirm empty state shows when no companies exist
- [ ] Confirm add company works for owner
- [ ] Confirm edit company works for owner
- [ ] Confirm delete company works for owner
- [ ] Confirm view-only access works for administrator

## Users
- [ ] Open the users screen
- [ ] Confirm the table loads
- [ ] Confirm loading indicator shows while fetching
- [ ] Confirm empty state shows when no users exist
- [ ] Confirm filters work
- [ ] Confirm view/edit works
- [ ] Confirm delete works
- [ ] Confirm the Add Users button is removed

## Invites
- [ ] Open the sent invites screen
- [ ] Confirm the page loads without redirecting
- [ ] Confirm loading indicator shows while fetching
- [ ] Confirm empty state shows when no invites exist
- [ ] Confirm invite sending works
- [ ] Confirm invite status updates after sending

## Messages
- [ ] Open the messages screen
- [ ] Confirm the table loads
- [ ] Confirm loading indicator shows while fetching
- [ ] Confirm empty state shows when no messages exist
- [ ] Confirm add message works
- [ ] Confirm edit message works
- [ ] Confirm delete message works
- [ ] Confirm template preview works
- [ ] Confirm pagination works

## Reminders
- [ ] Open the reminders screen
- [ ] Confirm the table loads
- [ ] Confirm loading indicator shows while fetching
- [ ] Confirm empty state shows when no reminders exist
- [ ] Confirm filters work
- [ ] Confirm bulk select and delete work
- [ ] Confirm message preview works
- [ ] Confirm reminder image preview works
- [ ] Confirm pagination works

## Templates
- [ ] Open the templates screen
- [ ] Confirm the page loads
- [ ] Confirm loading indicator shows while fetching
- [ ] Confirm empty state behavior is correct
- [ ] Confirm create template works
- [ ] Confirm edit template works
- [ ] Confirm delete template works
- [ ] Confirm default template selection works

## Settings
- [ ] Open the settings screen
- [ ] Confirm settings load correctly
- [ ] Confirm email settings screen loads
- [ ] Confirm 2FA settings screen loads
- [ ] Confirm saving settings works

## Password and Auth Flows
- [ ] Confirm forgot password page loads
- [ ] Confirm reset password page loads
- [ ] Confirm signup page loads
- [ ] Confirm invite-based signup works
- [ ] Confirm 2FA verify page works if enabled

## General Checks
- [x] Confirm protected pages redirect when logged out
- [x] Confirm no unexpected redirects happen after login
- [x] Confirm empty tables show a visible message
- [x] Confirm loading indicators appear on all table screens
- [x] Confirm browser console has no major errors

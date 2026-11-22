# Build Roadmap

## Current checkpoint — Preview foundation

- [x] Establish identity, project scope, and feature roadmap
- [x] React + TypeScript + Vite scaffold
- [x] Preserve the latest approved Home dashboard
- [x] Add responsive navigation and six main destinations
- [x] Add separate secondary-page styling so the Home dashboard remains intact
- [x] Add GitHub Actions type-check/build workflow
- [x] Add Cloudflare Pages preview branch and draft PR
- [x] Confirm preview build deployment and build check
- [x] Add Supabase auth session provider and auth screens
- [x] Add initial RLS-protected schema migration and profile editor
- [ ] Apply and verify the Supabase migration in the actual project
- [ ] Add Preview environment variables in Cloudflare Pages
- [ ] Test registration, confirmation, sign-in, password recovery, and profile save end-to-end

## Phase 1 — Secure member foundation

- [ ] Authenticated public/member routes and session-aware navigation
- [ ] Profile privacy and private optional details
- [x] Database-backed feed, posts, threaded comments, likes, and bookmarks (requires Supabase setup)
- [x] Member discovery, groups, friend requests, accepted friends, and blocking foundations (requires Supabase setup)
- [x] Fandom Hub project submissions, events, and RSVPs (requires Supabase setup)
- [ ] In-app notifications and preference controls
- [x] Report submission, moderation queue, project approval, and owner-controlled staff roles (requires Supabase setup)
- [x] Admin HQ owner bootstrap, role assignment, scoped project/event organiser controls and audit log schema
- [ ] Storage limits and deletion workflows (only if uploads are approved)

## Phase 2 — Fandom and interaction

- [ ] Friend-only direct messages and group chats
- [ ] Full Fun Zone games, question bank, daily rotation, Stardust and badges
- [ ] Fan Project Wall, tasks, campaigns, countdowns and event workflows
- [ ] LYKN Universe member and group content management
- [ ] LYKN Updates source links, review queue and schedule revisions
- [ ] Schedule graphic OCR and change detection, with human approval

## Phase 3 — Scale and release

- [ ] Accessibility, responsive, privacy and security testing
- [ ] Backup/export and recovery checks
- [ ] Performance testing for realistic active-user levels
- [ ] Closed invite-only testing
- [ ] Fix and monitor before worldwide registration
- [ ] Review free-tier capacity before growth; no paid upgrade without explicit approval

## Release rule

The production branch remains `main`. Preview work stays on a separate branch and draft pull request. Do not merge or change production deployment settings until the build, backend permissions, account flows, moderation controls, and backup plan have been reviewed.

# LYKYOU Space

**Your people. Your space. Your LYKN universe.**

LYKYOU Space is an independent global fan community operated by LYKN India Fanclub. It is unofficial and is not affiliated with LYKN, GMMTV, or their management.

## Current build status

This repository contains a multi-page **live-ready preview build**, not a production-connected social network yet.

- The approved Home dashboard is preserved and now reads published community posts, like/bookmark state, unread notification count and the next published community event when Supabase is connected.
- Registration, sign-in, password recovery, member profiles, profile privacy and account deletion requests are implemented against Supabase Auth/Postgres.
- Community workflows include publishing, editing and deleting your own posts, likes, bookmarks, threaded comments, reports, member search, friend requests and blocking.
- Groups support member join requests and staff approval.
- Fandom Hub supports project submissions and approval, volunteer tasks, events/RSVPs and campaigns.
- Fun Zone includes a playable This or That challenge with private session saving. Other games need a reviewed LYKN question bank before launch.
- LYKN Updates supports admin publishing and a source-linked schedule board with group/member filters.
- In-app notifications are generated for post likes, comments and friend-request activity.
- Admin HQ includes owner-controlled staff roles, moderation, project approval, organiser assignment and account deletion request review.
- Supabase is not connected to the hosted preview until the project URL and public anon/publishable key are configured. The database migrations must also be applied before these workflows can use live data.
- When Supabase is not configured, the app shows clearly labelled sample content. Sample content is not real member activity. Do not use the unconnected preview to collect member details.

### Preview

The current review branch is `chatgpt/full-space-build`. Its Cloudflare Pages branch preview is:

https://chatgpt-full-space-build.lykyou-space.pages.dev

The review branch is not the production branch. Do not merge the draft preview pull request until the feature, data, and security reviews are complete.

## Technology

- React 18 + TypeScript + Vite
- React Router
- Supabase Auth and Postgres (integration foundation)
- GitHub for source control
- Cloudflare Pages for hosting and branch previews

## Run locally

Requires Node.js 20+ and npm.

```bash
npm install
npm run dev
```

Open the local address printed by Vite.

## Build and type-check

```bash
npm run build
```

A GitHub Actions workflow runs this command on pushes to `main`, the `chatgpt/**` preview branches, and pull requests into `main`.

## Supabase setup

1. Copy `.env.example` to `.env.local`.
2. Add the Supabase project URL and public anon/publishable key. Never use a service-role key in browser code.
3. Apply `supabase/migrations/20261119000099_legacy_schema_compat.sql` first. It adapts the original starter schema and preserves its records.
4. Apply `supabase/migrations/20261119000100_phase1_foundation.sql`.
5. Apply `supabase/migrations/20261119000200_activity_notifications.sql` after the foundation migration.
6. After the first trusted owner account is registered, follow the owner bootstrap SQL in [SUPABASE_SETUP.md](SUPABASE_SETUP.md). Use the auth user's UUID from Supabase Auth.
7. Add the same two public environment variables to the Cloudflare Pages **Preview** environment. Add them to Production only when the production release is approved.

See [SUPABASE_SETUP.md](SUPABASE_SETUP.md) for the full connection and test checklist.

The migration does not create Storage buckets. Profile avatars currently use initials or external URLs; there is no paid storage dependency.

## Main destinations

1. Home
2. Community
3. Fun Zone
4. Fandom Hub
5. LYKN Universe
6. LYKN Updates

Admin HQ is available only to authorised staff accounts.

## Brand and safety

- Members are called **LYKYOUs**.
- LYKN member order: WILLIAM, LEGO, NUT, HONG, TUI.
- Bias and bias-wrecker support multiple selections, all five, or no selection.
- Visual modes: the current preview uses the Galaxy direction; Cloud mode remains a later design task.
- Public profile fields are separated from optional private profile details in the schema.
- Staff permissions are server-enforced through database roles and RLS; never rely on hiding admin buttons in the UI.
- No paid APIs, storage, subscriptions, or upgrades are part of the approved budget.

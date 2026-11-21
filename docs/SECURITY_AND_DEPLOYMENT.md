# Security and deployment notes

## Preview status

- The Cloudflare Pages branch preview is a public visual preview. Do not enter real member information until the Supabase project is configured and the database migration has been applied and tested.
- The draft pull request is for preview only. Production remains on `main`.
- GitHub Actions currently verifies TypeScript compilation and the Vite production build. It does not verify database policies or browser behaviour.

## Supabase environment

Only these browser-safe values belong in the frontend environment:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` (or the Supabase publishable key if the project uses the newer key format)

Never add a Supabase service-role key to a `VITE_*` variable, source file, GitHub commit, or browser environment. Service-role credentials bypass RLS and must remain server-side.

Configure these values separately for Cloudflare Pages **Preview** and **Production**. Do not turn on production auth until the database setup is verified.

## Initial schema migration

File: `supabase/migrations/20261119000100_phase1_foundation.sql`

The migration establishes:
- Public profile fields in `profiles`; optional location, fan journey and social links in a separate private table.
- Posts, threaded comments, likes, bookmarks, blocks, friend requests and accepted friendships.
- Groups, memberships, events, RSVPs, projects, tasks, and project/event organiser assignments.
- Notifications, LYKN Updates, staff roles and admin audit logs.
- RLS policies for the tables and a profile creation trigger for new Supabase Auth users.

The migration intentionally creates no Storage buckets. No file uploads or paid storage are enabled.

### Important manual owner bootstrap

The first trusted owner account must be registered before an owner role is assigned. Use the exact `auth.users.id` UUID from Supabase Auth and run the commented owner bootstrap statement at the end of the migration from the Supabase SQL Editor. Do not create a browser-facing owner promotion flow. The browser client cannot insert or update staff roles. Owner-only RPC functions manage staff roles and ownership transfer; revoking a project organiser role also clears their scoped project/event assignments.

## Required checks before launch

1. Apply the migration to a non-production/test project first, then inspect all tables, grants, triggers and RLS policies.
2. Test anonymous access, authenticated member access, blocked-user access, and each staff role separately.
3. Confirm private profile details cannot be read through the public profile endpoint.
4. Confirm a normal user cannot assign staff roles, publish LYKN Updates, approve member project submissions, or read reports.
5. Test email confirmation, password recovery, sign-out, account deletion and profile editing.
6. Test all routes on desktop and mobile.
7. Confirm free-tier quotas and backup/restore options before accepting members.

## Known unfinished security work

- Friend requests and accepted friendships are implemented through security-definer RPC functions. Friend-only messages and group chats remain Phase 2.
- Project and event organisers use dedicated assignment tables and policies; owner-only Admin HQ controls assign them to specific work.
- The initial migration needs a live Supabase SQL validation and role-by-role RLS test before it is considered production-ready.
- Report submission, moderation review, and project approval UI are present. Notifications, moderation audit events, and additional server-side workflows still need completion.
- Rate limiting, anti-spam protections, and account-abuse monitoring need to be added before open registration.

Never treat the preview UI or this schema draft as a completed production security review.

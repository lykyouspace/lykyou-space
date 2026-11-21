# LYKYOU Space — connect the live backend

The three Phase 1 database migrations have already been applied successfully to the connected `lykyou-space` Supabase project in the Mumbai region. The migration history records all three steps. All 28 public tables have Row Level Security enabled. Do not run these migrations again on this project.

The remaining connection steps below are for the Cloudflare Pages Preview and owner account. These use the free Supabase/Cloudflare configuration; do not enable paid add-ons or upgrade plans without approval.

## 1. Database migration record

For reference, the applied migration order was:

1. `supabase/migrations/20261119000099_legacy_schema_compat.sql` — preserves and adapts the original starter tables.
2. `supabase/migrations/20261119000100_phase1_foundation.sql`
3. `supabase/migrations/20261119000200_activity_notifications.sql`

The compatibility step preserved the original starter tables, adapted legacy column names, moved sensitive profile fields into `profile_private`, and removed conflicting legacy policies. The foundation step created the Phase 1 data model and policies. The final step added notifications, project volunteering, campaign participation, game progress, deletion requests and source-linked schedule entries.

The original database had no user records, so there were no member posts or accounts to lose. Do not remove RLS policies or expose a service-role key in the website.

## 2. Configure Supabase Auth URLs

In **Authentication → URL Configuration**:

- Set the Site URL to the website URL you intend to use.
- Add the Cloudflare Pages preview URL to Redirect URLs: `https://chatgpt-full-space-build.lykyou-space.pages.dev/**`
- Add your final production domain before opening worldwide registration.
- Keep email confirmation enabled for public sign-ups.

## 3. Add the public Supabase settings to Cloudflare Pages

In Cloudflare Dashboard → **Workers & Pages → lykyou-space → Settings → Environment variables**, add these for both Preview and Production:

- `VITE_SUPABASE_URL` — the Project URL from Supabase → Project Settings → API.
- `VITE_SUPABASE_ANON_KEY` — the public anon/publishable key from Supabase → Project Settings → API.

These two values are intended for browser use. **Never add `service_role`, a secret API key, database password, or personal access token to a `VITE_*` variable.**

Save and trigger a new Pages deployment. Environment variables are applied at build time.

## 4. Create the owner account

1. Open the deployed site and create your own account first.
2. In Supabase, open **Authentication → Users** and copy the UUID for that account.
3. In SQL Editor, run the following after replacing both placeholders with that same UUID:

```sql
insert into public.staff_roles (user_id, role, assigned_by)
values ('YOUR_AUTH_USER_UUID'::uuid, 'owner', 'YOUR_AUTH_USER_UUID'::uuid);
```

4. Sign out and sign back in. Admin HQ should now appear for the owner account.

This is a one-time manual bootstrap. Ordinary members cannot appoint themselves or change staff roles.

## 5. Verify before inviting members

- Create a test member account and confirm email verification works.
- Save a profile and test public/member/private profile visibility.
- Publish a post, like it, comment, bookmark it and confirm notifications appear.
- Test friend requests and blocking with two test accounts.
- Create a group, request to join, and approve the request as staff.
- Submit a project idea, approve it in Admin HQ, create a task and volunteer from a second account.
- Publish a test event and RSVP from a second account.
- Publish a source-linked LYKN schedule entry and a LYKN Update as an admin.
- Test report submission and moderation.
- Test password reset and account deletion request handling.
- Test on mobile and desktop before inviting the wider community.

## Important limitations

- The website does not use Supabase Storage for member media. Photo/video uploads are not enabled; this avoids unexpected storage use. Use approved external links until a free, quota-controlled media approach is chosen.
- In-app notifications are generated for post likes, comments and new friend requests. Browser push and automated email digests are not enabled.
- The LYKN schedule board supports source-linked admin entries. Automatic monitoring of social platforms, OCR of schedule graphics and revision detection are not yet automatic; admins must verify and enter schedule entries.
- DMs and group chats remain Phase 2.
- The account deletion form submits a private request. An authorised admin must complete the secure Auth account removal process; the browser never receives privileged Auth Admin access.
- Free-tier limits can change. Monitor Supabase database, bandwidth and Cloudflare usage; do not upgrade or enable paid services without explicit approval.

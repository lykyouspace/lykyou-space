# LYKYOU Space — Feature Expansion Roadmap

Status: approved scope; implementation must be delivered in working, tested slices.
Target branch: main only. Production: https://lykyou-space.pages.dev/

## Non-negotiable delivery rules
- Do not call a feature complete until it is reachable in the production UI and its advertised actions work.
- Keep the platform independent and clearly unofficial; link to official LYKN channels without implying affiliation.
- No paid services, plans, domains, or storage. Do not trigger upgrades.
- Prefer browser-side computation and static, version-controlled reference data over Supabase rows or Storage objects.
- No large media uploads for games, stories, setlists, or link directories.
- Every database-backed feature needs reviewed RLS, bounded reads, input limits, and cleanup/retention rules.
- Preserve correct member identity; never guess or substitute member photographs.
- The WOLF mascot must use the actual supplied artwork from the LYKYOU Space design reference, not a crop of the LYKN India wordmark.

## Stage 0 — Repair and verify the existing product
1. Confirm Cloudflare Pages production deployment is wired to the main branch and verify the live build SHA.
2. Correct the WOLF asset using the supplied mascot artwork and verify it is visible in the sidebar, home, mobile navigation, and selected feature banners.
3. Align page layouts with the approved reference design; verify desktop, mobile, and split-screen.
4. Show the profile guestbook on the signed-in user's own profile as well as public member profiles; retain reporting, replies, deletion permissions, and RLS.
5. Audit Fun Zone persistence. The current game_sessions game_key constraint only permits this_or_that, while the client attempts to save other game keys. Fix schema/client compatibility before adding competitive records.

## Stage 1 — LYKN Music & Content Hub
- Interactive discography with release type, era, year, member, and search filters.
- LYKN content search across the verified in-app archive.
- Streaming resource centre with official platform destinations and region-aware notes.
- Music platform link directory (Spotify, Apple Music, YouTube Music and other verified destinations).
- External media embed manager with an allowlist of supported providers, URL validation, privacy-conscious click-to-load embeds, and no media proxy/storage.
- LYKN official links hub. Links must be checked against official public accounts before publication.
- Admin-managed links and catalogue entries; no member-submitted links go live without review.

## Stage 2 — Fun Zone
- Seasonal challenges and daily rotating challenges.
- Weekly tournaments and asynchronous multiplayer score competitions.
- Difficulty levels and timed challenges.
- Automatic question rotation and question pools.
- LYKN Crossword.
- Scoreboards, personal bests, participation history, and fair-play validation.
- Browser-side game logic; persist only compact scores/attempt summaries. No realtime multiplayer rooms in the first version.

## Stage 3 — Interactive experiences
- Branching Story Mode with chapters, choices, multiple endings, and replay.
- Dream Concert Setlist Creator with reorderable songs, set sections, duration estimates, and share/export.
- Story state and setlists remain local by default; optional compact save/share records only with explicit user action.

## Stage 4 — Profiles and achievements
- Guestbook on own and public profiles, with positive-community guidance, replies, reports, and moderation.
- Achievement history and badge collection.
- Game records, tournament placements, event participation, and project contributions.
- Read-only history summaries where possible; do not store duplicate activity payloads.

## Stage 5 — Additional approved ideas
- LYKN Era Explorer.
- Song Roulette.
- Bias Passport.
- Fandom Memory Lane.
- Watch Party Planner (external video links only).
- Playlist Exchange (platform links only).
- LYKYOU Time Capsule.
- Fan Project Missions.
- LYKN Bingo Generator.
- Global LYKYOU Board.

## Storage and free-tier policy
- Static catalogues, official links, question banks, crossword puzzles, story chapters, and setlist editing should be client-side/static assets.
- Supabase stores only identity-linked, compact records that need to sync across devices (comments, best scores, tournament entries, optional achievements).
- No uploaded artwork/audio/video for these features. Use verified external links and click-to-load embeds.
- Bound query sizes, add indexes, rate-limit writes, and prevent repeat score spam.
- If a feature cannot fit safely within the current free tier, ship a local-only version or defer its synced component. Never silently enable paid usage.

## Release gates
A stage is not done until:
1. TypeScript/Vite build passes.
2. RLS and migrations are reviewed and applied only when needed.
3. UI actions are tested with signed-out, member, and staff roles as appropriate.
4. Responsive layouts are checked.
5. Production deployment SHA and the live page are verified.

# TurboWatch

A social discovery app for watching videos, finding inspiration, saving collections, and connecting with creators. Built with Next.js, React, TypeScript, and Supabase. Designed for desktop and mobile.

[![Deploy to Vercel](https://vercel.com/button)](https://vercel.com/new/git/external?repository-url=https%3A%2F%2Fgithub.com%2FTurboTwitch0%2FTurboWatch)

## Run locally

Requires Node.js 24 and npm.

```sh
npm ci
npm run dev
```

The app runs on port 3000. No account or external service is needed to try the demo. Demo activity is stored in this browser; accounts and conversations in the demo are fictional. Shared demo links open seeded posts in other browsers; your uploaded demo content remains local.

### Expanded demo

The demo includes **40 posts: 12 shorts and 28 photo posts**, **14 fictional creators**, **7 collections**, **45 sample comments**, and **26 sample messages across 8 conversations**. The demo profile has its own posts. All images, clips, and fonts are bundled locally; credits and licenses are linked from the footer.

Use `/?demo=1` or **Explore demo** to try it even when a Supabase project is connected but still being set up. **Exit demo** returns to the shared community. Switching modes and navigating within the app do not reload the page. Demo activity stays in this browser and is separate from real accounts. Returning demo visitors automatically receive new sample content while keeping their own uploads, edits, likes, unsaves, comments, messages, and collections.

Shorts support the previous/next controls, keyboard arrows, and vertical swipes. The category row includes all available categories, including Art and Music.

### Included

- Photo and video feed, search, category filters, creator discovery, and a dedicated shorts player.
- Likes, comments, reposts, native sharing or copyable post links, and following creators.
- Private saved collections, profile editing, photo/video publishing, and direct messages.
- Responsive layouts, keyboard navigation, accessible dialogs, reduced-motion support, and locally bundled media/fonts.
- A persistent local demo, plus a Supabase-backed mode with real authentication and shared data.

Demo uploads allow files up to 2 MB, subject to the browser's storage quota. Larger videos can use hosted URLs. Community uploads allow up to 50 MB. Uploads and posts are public; message text and collections are private to their participants/owners.

## Enable the shared community

1. Create a Supabase project and execute the complete [supabase/schema.sql](supabase/schema.sql) in its SQL editor. The migration is rerunnable and includes ownership rules, private-message policies, authentication profile creation, atomic collection saves, and the public media bucket.
2. Copy `.env.example` to `.env.local`. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` using the project's URL and **public anon/publishable key** from its API settings. Never use a service-role key in a `NEXT_PUBLIC_` variable.
3. In Supabase Authentication URL Configuration, set the Site URL to your deployed HTTPS origin. For local testing, add the local origin as an allowed redirect URL. Enable email/password authentication. If email confirmation is enabled, users must confirm their email before signing in.
4. Restart development or rebuild production. Next.js embeds these public variables at build time. When both values are supplied, the app uses the shared backend and starts with an empty community instead of fictional demo content. Create an account and publish the first post.

The schema's Realtime publication includes public posts/comments and participant-filtered messages. Collections and saved state refresh after each mutation. A network or schema failure displays an error; the app does not silently switch a live community to demo mode.

### Fix `PGRST205`: `public.profiles` missing from the schema cache

This error means the Supabase Data API cannot resolve the table in its schema cache. The schema may be missing, installed in a different project, or awaiting a cache refresh.

1. Open the Supabase project whose **Project URL** matches the `NEXT_PUBLIC_SUPABASE_URL` already configured for your Vercel app. The public key must come from that same project.
2. In that project's **SQL Editor**, create a new query, paste the **complete** [supabase/schema.sql](supabase/schema.sql), and run it. Include the full transaction through `COMMIT`; creating only `profiles` leaves the other tables, authentication trigger, policies, and collection functions missing. The script is safe to rerun. Resolve any SQL error before continuing; a failed transaction does not install the schema.
3. Run this verification query in the same SQL Editor. Every row must show `present = true`:

   ```sql
   select table_name,
     to_regclass('public.' || table_name) is not null as present
   from (values
     ('profiles'), ('posts'), ('post_likes'), ('reposts'), ('saved_posts'),
     ('comments'), ('follows'), ('boards'), ('board_posts'), ('messages'),
     ('message_reads')
   ) as required(table_name);
   ```

4. If all tables exist and the same error persists, ensure `public` is included in the project's Data API **exposed schemas**, then run:

   ```sql
   notify pgrst, 'reload schema';
   ```

   The full schema script also requests this reload after its transaction succeeds. Allow a moment for the API cache to refresh, then retry the existing app page.

Applying the database schema or refreshing its API cache takes effect without a Vercel redeployment. Changing a `NEXT_PUBLIC_` URL or key requires a new app build because Next.js embeds those values at build time. Never paste database passwords or service-role keys into the app or a support message.

## Shared interactions without page refreshes

With the Supabase setup complete, signed-in users share real posts, likes, comments, follows, reposts, and direct messages. Post owners receive activity notifications, and reposts appear on public profiles. Saved posts and collections remain private; messages are visible only to their participants.

The client subscribes using the current account's authenticated Realtime session. Incoming changes update in place. If the socket is unavailable, a visible tab checks for updates every five seconds; reconnecting or returning to the tab also refreshes its data in the background. Bursts of events are combined to avoid overlapping reads. Feed cards and unchanged records retain their identities, so social updates preserve the document, playing media, scroll, focused inputs, and unfinished drafts. The inbox keeps the selected conversation and a draft for each person; incoming messages do not force you to the bottom while you are reading older messages.

The repository's database access policies still control who can read or write each record. Browser-local demo interactions do not reach real people. Hosted Supabase connectivity requires your project's setup and cannot be established by the local integration tests alone.

## Deploy to Vercel

Click [Deploy to Vercel](https://vercel.com/new/git/external?repository-url=https%3A%2F%2Fgithub.com%2FTurboTwitch0%2FTurboWatch) to import this GitHub repository into your Vercel account. If Vercel asks for GitHub access, allow access to `TurboTwitch0/TurboWatch`.

1. Import `TurboTwitch0/TurboWatch` from branch `main`. Keep the Root Directory at the repository root (`./`), choose **Next.js**, and use **Node.js 24.x**. Do not set the Root Directory to `TurboWatch`; that folder name belongs to the cloud workspace, not the repository.
2. Leave the Supabase variables unset to deploy the interactive demo immediately. No database or secret is required for demo mode.
3. Click **Deploy**. `vercel.json` supplies the install command (`npm ci`) and build command (`npm run build`). Leave the Output Directory at the Next.js default; do not set it to `public` or `out`.
4. Open the HTTPS URL Vercel provides. Try a video, save a post, and reload to check browser-local persistence. Your website is public once Vercel reports the deployment is ready.

For real accounts and shared posts/messages, follow **Enable the shared community** above, configure both Supabase public variables in Vercel **before building**, and set Supabase's Site URL and allowed redirects to your deployed HTTPS origin. Rebuild/redeploy after changing a `NEXT_PUBLIC_` variable. Demo mode does not send messages to real people or share new posts across devices.

Future pushes to `main` deploy automatically after this repository is linked to Vercel. If the direct import link does not preselect the repository, open [Vercel New Project](https://vercel.com/new), find `TurboTwitch0/TurboWatch`, and choose **Import**.

You can also deploy with Vercel CLI from this directory using your own authenticated Vercel session: `npx vercel`. No Vercel project, account, or production domain has been linked by this implementation.

## Validation

```sh
npm run typecheck
npm run test:schema
npm run test:demo
npm run test:e2e
npm run build
npm start
```

The database test runs PostgreSQL locally in isolated PGlite memory. It applies the actual schema twice and runs 25 checks for ownership, private messaging, collection isolation, uploads, profile verification restrictions, and atomic saves. It does not contact a Supabase project.

Playwright covers search/filtering, persisted likes/saves, comments/reposts/share links, collections, profile editing, direct messages, publishing, all 12 video files, mobile navigation, demo upgrades, keyboard/swipe shortcuts, and preservation of media/scroll/drafts across interactions. The nine Node demo-state tests check migration of older browser data without losing user activity. The runner starts the app automatically when needed. It uses system Chromium when available; otherwise install Playwright Chromium with `npx playwright install chromium`. Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` for another local Chromium installation, or `TEST_BASE_URL` to test an already running server.

The opt-in `tests/live-sync.spec.ts` uses two isolated signed-in browser contexts, the actual Supabase client SDK, and a controlled local HTTP fixture. It checks recipient notifications, shared publishing, bidirectional private messages, polling recovery, and preservation of the receiver's document/video/draft. Its fixture deliberately refuses Realtime sockets. It does **not** connect to hosted Supabase or substitute for the separate PostgreSQL policy tests. To run it, start a separate app instance using only these test values:

```sh
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:4400 \
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_turbowatch_local_fixture \
npm run dev -- --port 3002
```

Then run:

```sh
TEST_BASE_URL=http://127.0.0.1:3002 LIVE_TEST_BASE_URL=http://127.0.0.1:3002 \
npm run test:e2e -- tests/live-sync.spec.ts
```

The test starts and stops its local API fixture. These values are test-only public placeholders, not real project credentials. Keep them out of production settings.

Verified during development: production build, TypeScript, all 25 database checks, the browser workflows, the two-account local integration, the demo-state migration tests, and all 12 local videos. Live Supabase connectivity and public Vercel deployment require your project configuration and have not been verified.

## Project map

- `app/page.tsx` — feed, navigation, shorts, collections, profiles, comments, and inbox.
- `app/globals.css` — responsive visual system.
- `components/Dialogs.tsx` — publishing, profile, authentication, collections, and sharing forms.
- `lib/store.tsx` — persistent demo and Supabase adapters.
- `lib/seed.ts` — fictional demo content.
- `supabase/schema.sql` — shared backend and row-level access policies.
- `public/media/SOURCES.md` — bundled media credits and licenses.

Each cloud task already runs in an isolated environment. Continue in the existing checkout; do not create another Git worktree unless the user requests one.

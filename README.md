# TurboWatch

**Follow your curiosity.** Watch short stories, discover photography, save good finds, and share a point of view. Built with Next.js, React, TypeScript, and Supabase for desktop and mobile.

The original TurboWatch lightning identity now has a coordinated pine/ivory/coral system across discovery, watching, profiles, account recovery, and system states. Signed-out visitors get a useful product preview: real community posts when available, otherwise clearly labeled bundled examples. **Sign in to share** opens real account access; **See the sample library** explicitly opens the separate local preview.

Reusable launch assets and a visual style guide are in [outputs/turbowatch-launch](outputs/turbowatch-launch/README.md). Download the [complete launch ZIP](outputs/turbowatch-launch/turbowatch-launch-kit.zip), or use the [asset manifest](outputs/turbowatch-launch/asset-manifest.json) for exact paths, SHA-256 hashes, and Git blob IDs. Known deployment and email-delivery limits are recorded in [docs/hosted-status.md](docs/hosted-status.md).

**Real accounts setup:** Follow [supabase/SETUP.md](supabase/SETUP.md), run the complete updated [schema.sql](supabase/schema.sql), and configure the two Supabase variables in Vercel before rebuilding. The normal `/` site never signs visitors into Alex Carter. Missing configuration shows setup instructions.

[![Deploy to Vercel](https://vercel.com/button)](https://vercel.com/new/git/external?repository-url=https%3A%2F%2Fgithub.com%2FTurboTwitch0%2FTurboWatch)

## Run locally

Requires Node.js 24 and npm.

```sh
npm ci
npm run dev
```

The app runs on port 3000. Copy `.env.example` to `.env.local`, configure your Supabase project using [the setup guide](supabase/SETUP.md), then restart. The default site uses real email/password accounts and shared data. Without the connection, visitors stay signed out and see setup instructions; the app never substitutes a fictional account.

### Expanded demo

The demo includes **40 posts: 12 shorts and 28 photo posts**, **14 fictional creators**, **7 collections**, **45 sample comments**, and **26 sample messages across 8 conversations**. The demo profile has its own posts. All images, clips, and fonts are bundled locally; credits and licenses are linked from the footer.

The optional `/?demo=1` URL is an explicitly labeled sample preview; it is not the sign-in flow. **Sign in to real account** exits the preview and opens real account access without reloading the page. There is no sample-mode entry button on the normal community site. Sample activity stays in this browser and is separate from real accounts; old local posts are not automatically published under a new identity. Returning demo visitors automatically receive new sample content while keeping their own uploads, edits, likes, unsaves, comments, messages, and collections.

Shorts support the previous/next controls, keyboard arrows, and vertical swipes. The category row includes all available categories, including Art and Music.

### Included

- Photo and video feed, search, category filters, creator discovery, and a dedicated shorts player.
- Likes, comments, reposts, native sharing or copyable post links, and following creators.
- Private saved collections, profile editing, photo/video publishing, and direct messages.
- Responsive layouts, keyboard navigation, accessible dialogs, reduced-motion support, and locally bundled media/fonts.
- Real email/password registration and sign-in, unique profiles, persisted sessions, confirmation-email handling and resending, password recovery, and Supabase-backed shared data. A separate explicit sample URL is available for development.

Demo uploads allow files up to 2 MB, subject to the browser's storage quota. Larger videos can use hosted URLs. Community uploads allow up to 50 MB. Uploads and posts are public; message text and collections are private to their participants/owners.

## Enable the shared community

Use the complete [new Supabase setup guide](supabase/SETUP.md) for fresh projects or to upgrade an existing project without deleting real users or posts. The SQL includes a per-account profile trigger, repairs missing profiles for existing auth users, preserves profile edits, and prevents username collisions.

1. Create a Supabase project and execute the complete [supabase/schema.sql](supabase/schema.sql) in its SQL editor. The migration is rerunnable and includes ownership rules, private-message policies, authentication profile creation, atomic collection saves, and the public media bucket.
2. Copy `.env.example` to `.env.local`. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` using the project's URL and **public anon/publishable key** from its API settings. Never use a service-role key in a `NEXT_PUBLIC_` variable.
3. In Supabase Authentication URL Configuration, set the Site URL to your deployed HTTPS origin. For local testing, add the local origin as an allowed redirect URL. Enable email/password authentication. If email confirmation is enabled, users must confirm their email before signing in.
4. Restart development or rebuild production. Next.js embeds these public variables at build time. The normal app always uses real account access; the connection must be configured for it to work. New projects start with an empty shared feed. Create your own account and publish the first post. Each account gets its own profile ID and unique username; display names can match without sharing an account.

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

## Account recovery

Use **Forgot password?** on sign-in to request a real Supabase reset email. The reset screen supports password confirmation, show/hide controls, recoverable errors, and refresh in the same tab. A valid recovery session is required before changing a password; an expired link or an unrelated existing account cannot authorize a reset. Set the deployed `/?auth=recovery` URL in Supabase’s allowed redirects as described in [the setup guide](supabase/SETUP.md). The account menu exposes sign-out from every view, including when the account is authenticated but its profile cannot be loaded.

## Search

Search finds published posts by title, description, category, tags (including `#tag`), and creator name or `@username`. Matching people appear above the post results. Searches ignore case and accents and support multiple words. Changing the search clears a stale category filter. Use **All posts / Photos / Videos** and **Recommended / Newest / Most liked** to narrow the loaded feed. Category, media, and sort choices are preserved in the URL and restored by reload/back/forward. The `q` URL parameter preserves the query when you reload or share a search link, and browser back/forward restores it without refreshing the document. Search on the normal site reads the loaded shared feed (up to the latest 200 posts) and available public profiles. Explicit sample-mode searches stay within the fictional library.

## Shared interactions without page refreshes

With the Supabase setup complete, signed-in users share real posts, likes, comments, follows, reposts, and direct messages. Post owners receive activity notifications, and reposts appear on public profiles. Saved posts and collections remain private; messages are visible only to their participants.

The client subscribes using the current account's authenticated Realtime session. Incoming changes update in place. If the socket is unavailable, a visible tab checks for updates every five seconds; reconnecting or returning to the tab also refreshes its data in the background. Bursts of events are combined to avoid overlapping reads. Feed cards and unchanged records retain their identities, so social updates preserve the document, playing media, scroll, focused inputs, and unfinished drafts. The short player retains the selected video by ID when new posts arrive, preserving playback. Account changes clear recent activity and unfinished comments, and private Saved posts are never shown on another creator’s profile after browser navigation. The inbox keeps the selected conversation and a draft for each person; incoming messages do not force you to the bottom while you are reading older messages.

The repository's database access policies still control who can read or write each record. Browser-local demo interactions do not reach real people. Hosted Supabase connectivity requires your project's setup and cannot be established by the local integration tests alone.

## Deploy to Vercel

Click [Deploy to Vercel](https://vercel.com/new/git/external?repository-url=https%3A%2F%2Fgithub.com%2FTurboTwitch0%2FTurboWatch) to import this GitHub repository into your Vercel account. If Vercel asks for GitHub access, allow access to `TurboTwitch0/TurboWatch`.

1. Import `TurboTwitch0/TurboWatch` from branch `main`. Keep the Root Directory at the repository root (`./`), choose **Next.js**, and use **Node.js 24.x**. Do not set the Root Directory to `TurboWatch`; that folder name belongs to the cloud workspace, not the repository.
2. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` for the deployment environment before building, using the URL and public anon/publishable key from the same Supabase project. Missing variables show account setup instructions and do not enable demo sign-in.
3. Click **Deploy**. `vercel.json` supplies the install command (`npm ci`) and build command (`npm run build`). Leave the Output Directory at the Next.js default; do not set it to `public` or `out`.
4. Open the HTTPS URL Vercel provides without `?demo=1`. Create and confirm your real account, publish a post, then open a private browser window to check that the post is public. Use the two-account checks in [supabase/SETUP.md](supabase/SETUP.md) to verify interactions.

For real accounts and shared posts/messages, follow **Enable the shared community** above, configure both Supabase public variables in Vercel **before building**, and set Supabase's Site URL and allowed redirects to your deployed HTTPS origin. Rebuild/redeploy after changing a `NEXT_PUBLIC_` variable. Demo mode does not send messages to real people or share new posts across devices.

Future pushes to `main` deploy automatically after this repository is linked to Vercel. If the direct import link does not preselect the repository, open [Vercel New Project](https://vercel.com/new), find `TurboTwitch0/TurboWatch`, and choose **Import**.

You can also deploy with Vercel CLI from this directory using your own authenticated Vercel session: `npx vercel`. The existing production address is <https://turbo-watch-turbo-twitch.vercel.app>. Its deployment protection and public email-delivery limits remain in place; see [hosted status](docs/hosted-status.md). This pass publishes source to GitHub only.

## Validation

```sh
npm run typecheck
npm run test:schema
npm run test:demo
npm run test:e2e
npm run build
npm start
```

The database test runs PostgreSQL locally in isolated PGlite memory. It applies the actual schema twice and runs 40 checks for ownership, private messaging, collection isolation, uploads, profile verification restrictions, and atomic saves. It does not contact a Supabase project.

Playwright covers search/filtering, persisted likes/saves, comments/reposts/share links, collections, profile editing, direct messages, publishing, all 12 video files, mobile navigation, demo upgrades, keyboard/swipe shortcuts, and preservation of media/scroll/drafts across interactions. The nine Node demo-state tests check migration of older browser data without losing user activity. The default browser run uses an unconfigured app: `auth-required.spec.ts` verifies that missing configuration never creates a fake login, and sample workflows explicitly visit `?demo=1`. Keep Supabase variables unset for that run; use the separate connected fixture command below for account tests. The runner starts the app automatically when needed. It uses system Chromium when available; otherwise install Playwright Chromium with `npx playwright install chromium`. Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` for another local Chromium installation, or `TEST_BASE_URL` to test an already running server.

The opt-in tests in `tests/live-sync.spec.ts` use isolated browser contexts, the actual Supabase client SDK, and a controlled local HTTP fixture. They check actual email/password requests to the test API, unique signup profiles, email confirmation, password rejection, persisted sessions, logout isolation, recipient notifications, shared publishing/search, bidirectional private messages, polling recovery, and preservation of the receiver's document/video/draft. Its fixture deliberately refuses Realtime sockets. It does **not** connect to hosted Supabase or substitute for the separate PostgreSQL policy tests. To run it, start a separate app instance using only these test values:

```sh
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:4400 \
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_turbowatch_local_fixture \
npm run dev -- --port 3002
```

Then run:

```sh
TEST_BASE_URL=http://127.0.0.1:3002 LIVE_TEST_BASE_URL=http://127.0.0.1:3002 \
npm run test:e2e -- tests/live-sync.spec.ts tests/account-recovery.spec.ts
```

The test starts and stops its local API fixture. These values are test-only public placeholders, not real project credentials. Keep them out of production settings.

The identity/launch pass added three focused brand checks and verified eleven focused production/local-SDK scenarios, including keyboard access, real account setup, sample labeling, watch/share state, responsive layouts, and reduced-motion behavior. The final production build and canonical/social-image delivery checks passed. No backend policy or authentication code changed in this design pass.

The earlier account/discovery improvement pass verified the production build and TypeScript, 19 production browser workflows, 10 controlled SDK authentication/synchronization cases, and responsive layouts at 320, 390, 768, and 1440 pixels. Earlier validation also covered the unchanged database schema’s 40 access checks, demo-state migration, and all 12 local videos. Live Supabase connectivity and public Vercel deployment require your project configuration and have not been verified.

## Project map

- `app/page.tsx` — feed, navigation, shorts, collections, profiles, comments, and inbox.
- `app/globals.css` — responsive visual system.
- `components/Dialogs.tsx` — publishing, profile, authentication, collections, and sharing forms.
- `lib/store.tsx` — persistent demo and Supabase adapters.
- `lib/search.ts` — post, creator, username, and tag matching.
- `supabase/verify.sql` — read-only project installation diagnostics.
- `supabase/SETUP.md` — real-account configuration and repair steps.
- `lib/seed.ts` — fictional demo content.
- `supabase/schema.sql` — shared backend and row-level access policies.
- `public/media/SOURCES.md` — bundled media credits and licenses.

Each cloud task already runs in an isolated environment. Continue in the existing checkout; do not create another Git worktree unless the user requests one.

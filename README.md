# TurboWatch

A social discovery app for watching videos, finding inspiration, saving collections, and connecting with creators. Built with Next.js, React, TypeScript, and Supabase. Designed for desktop and mobile.

## Run locally

Requires Node.js 20.9 or later and npm.

```sh
npm ci
npm run dev
```

The app runs on port 3000. No account or external service is needed to try the demo. Demo activity is stored in this browser; accounts and conversations in the demo are fictional. Shared demo links open seeded posts in other browsers; your uploaded demo content remains local.

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

## Deploy to Vercel

The repository is ready for Vercel's automatic Next.js detection. No custom build settings are needed.

1. Commit this project to your GitHub repository and import it in Vercel. Choose the directory containing `package.json` as the Root Directory.
2. To deploy demo mode, leave the Supabase variables unset. For a real community, apply the schema and configure both public Supabase variables in Vercel for the intended environment **before building**.
3. Deploy, then set Supabase's Site URL to the resulting HTTPS domain. Rebuild/redeploy after changing a `NEXT_PUBLIC_` variable.

You can also deploy with Vercel CLI from this directory using your own authenticated Vercel session: `npx vercel`. No Vercel project, account, or production domain has been linked by this implementation.

## Validation

```sh
npm run typecheck
npm run test:schema
npm run test:e2e
npm run build
npm start
```

The database test runs PostgreSQL locally in isolated PGlite memory. It applies the actual schema twice and runs 25 checks for ownership, private messaging, collection isolation, uploads, profile verification restrictions, and atomic saves. It does not contact a Supabase project.

The nine Playwright tests cover search/filtering, persisted likes/saves, comments/reposts/share links, collections, profile editing, direct messages, publishing, real video playback, and mobile navigation. The runner starts the app automatically when needed. It uses system Chromium when available; otherwise install Playwright Chromium using `npx playwright install chromium`. Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to use another local Chromium installation. Set `TEST_BASE_URL` to test an already running server, for example `TEST_BASE_URL=http://127.0.0.1:3001 npm run test:e2e`.

Verified during development: production build, TypeScript, all 25 database checks, all nine browser tests, and both local videos. Live Supabase connectivity and public Vercel deployment require your project configuration and have not been verified.

## Project map

- `app/page.tsx` — feed, navigation, shorts, collections, profiles, comments, and inbox.
- `app/globals.css` — responsive visual system.
- `components/Dialogs.tsx` — publishing, profile, authentication, collections, and sharing forms.
- `lib/store.tsx` — persistent demo and Supabase adapters.
- `lib/seed.ts` — fictional demo content.
- `supabase/schema.sql` — shared backend and row-level access policies.
- `public/media/SOURCES.md` — bundled media credits and licenses.

Each cloud task already runs in an isolated environment. Continue in the existing checkout; do not create another Git worktree unless the user requests one.

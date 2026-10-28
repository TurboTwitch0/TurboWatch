# TurboWatch hosted status

The existing deployment address is <https://turbo-watch-turbo-twitch.vercel.app>.
This repository continues to target that product and its existing audience.
Updates in this pass are delivered to GitHub only; no Vercel deployment is run.

The coordinating session's read-only service verification matched the app to
Supabase project reference `tbsbuhnoteksddvmkpum`. It verified the eleven app
tables, row-level security and permissions, the signup trigger, media bucket,
Email signup/confirmation settings, and redirect paths. Do not replace this
backend or apply a fresh schema simply because an unrelated project is visible
in another connector session.

Two hosted limits remain:

- Custom SMTP is disabled. Supabase's default sender is limited to project-team
  addresses, so public confirmation and password-reset delivery are blocked.
  Keep email confirmation and access policies enabled. An already authorized
  owner must resolve delivery using an approved provider; this work does not
  activate billing, buy a service, or send production test emails.
- Vercel protection blocks an end-to-end browser check of the deployed app.
  Deployed environment values and direct REST exposure remain unverified.
  Protection is preserved; a successful local fixture test is not evidence of
  successful hosted authentication.

The client still uses real Supabase Auth when configured and never substitutes a
sample identity for a real login. The optional sample library is labeled, stays
local, and is separate from community data. Launch assets use labeled sample
screenshots and make no claims about audience size or public launch readiness.

See [the setup guide](../supabase/SETUP.md) for the required public variables and
redirect configuration, and [read-only installation diagnostics](../supabase/verify.sql)
when investigating the existing project. Do not weaken confirmation, row-level
security, or deployment protection to make a check appear successful.

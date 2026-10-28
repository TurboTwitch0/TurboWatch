# Connect TurboWatch to real accounts

Use **one Supabase project for the whole site**. Every person signs up with their own email and password. The same project stores everyone's public posts, likes, comments, reposts, and follows. Messages are readable only by their sender and recipient; saved posts and collections are private to their owner.

This setup creates no demo accounts, sample posts, or shared Alex Carter login. Old activity from the browser demo was local and was never published to Supabase. Sign in with a real account and publish any posts you want other people to see.

## Check the existing project first

If you already have a Supabase project, compare its Project URL with the URL configured for your existing Vercel app. A generic project name or a similar table name does not establish that it belongs to this app. Do not point the site at another project or install the schema until that match is verified. [verify.sql](verify.sql) contains read-only metadata checks for the expected tables, columns, signup trigger, row-level policies, Realtime publication, and media bucket; it does not return user content or change access.

## 1. Run the updated database setup

These steps apply to both a **new project** and a project where you ran an earlier TurboWatch setup.

1. Open your project in the [Supabase dashboard](https://supabase.com/dashboard).
2. Open **SQL Editor → New query**.
3. Open [schema.sql](schema.sql), copy the **entire updated file**, paste it into that query, and click **Run**. Include everything from `begin;` through `commit;`.
4. Wait for success before continuing. If SQL reports an error, fix it and rerun the complete file. A failed transaction does not finish the installation.

The script is safe to rerun. It keeps existing accounts, profiles, posts, and interactions; repairs missing profiles for existing auth accounts; installs the signup trigger and access policies; configures public media uploads; and enables Realtime for shared activity. It does not reset your data.

The signup trigger creates one profile for each `auth.users.id`. People can have the same display name and still receive different usernames. People can edit their own name and username after signing in.

## 2. Enable real email signup and confirmation

In **Authentication**:

1. Under **Sign In / Providers → Email**, enable the Email provider. Ensure **Allow new users to sign up** is enabled in your authentication settings.
2. Keep **Confirm email** enabled for public signup. A new user must follow the email confirmation link before signing in. If you deliberately turn confirmation off, Supabase can sign them in immediately after signup instead.
3. Under **URL Configuration**, set **Site URL** to the actual public site origin, for example `https://your-site.vercel.app`.
4. Add that origin with a trailing slash, for example `https://your-site.vercel.app/`, to **Redirect URLs**. Add `https://your-site.vercel.app/?auth=recovery` as an allowed redirect for password reset emails. Add the equivalent URLs for your custom domain too if you use one. For local development, you can also add `http://localhost:3000/` and `http://localhost:3000/?auth=recovery`.
5. Leave the confirmation email template's link as `{{ .ConfirmationURL }}` unless you are intentionally customizing your auth flow. This app handles Supabase's normal email confirmation redirect.

For a public launch, configure your own SMTP provider under Authentication's email settings. Supabase's default email sender has delivery restrictions and rate limits; it is intended for trying authentication. The dashboard's authentication logs explain rejected signups, confirmation failures, and email rate limits.

The sign-in form includes **Forgot password?**. Supabase sends the reset email; opening a valid link shows **Choose a new password**. The app verifies that the recovery session belongs to that account before updating the password. Expired or invalid links offer a fresh reset email. Reloading a valid recovery screen in the same tab preserves the flow; a plain `?auth=recovery` URL alone never authorizes a password change.

Do not enable anonymous sign-in as a substitute for user accounts. This app uses email/password authentication.

## 3. Connect the same project to Vercel

From that Supabase project's **Connect** dialog or **Project Settings → API / API Keys**, copy its **Project URL** and **publishable key**. A legacy public `anon` key also works.

In your Vercel project's **Settings → Environment Variables**, set:

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Your project URL, such as `https://your-project.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | The publishable key (`sb_publishable_…`) or legacy public `anon` key from that same project |

Set these for **Production**, and for Preview/Development if you use those environments. The key's variable name remains `NEXT_PUBLIC_SUPABASE_ANON_KEY` even when you use a newer publishable key. Never use a `service_role` key, `sb_secret_…` key, database password, or connection string in either public variable.

Then **redeploy your Vercel app yourself**. Next.js puts these values into the browser build, so changing Vercel variables without a new deployment does not update the running app. For local development, put the same variables in `.env.local` and restart `npm run dev`.

Use your normal site address to sign in. `?demo=1` is an explicitly separate sample experience; it cannot publish activity to other people or create a real login.

## 4. Check two real accounts

1. Open your normal site address, click **Sign in**, and choose **Create account**. Use your own name, email, and password. Confirm your email when prompted, then sign in.
2. Create an image/video post using a supported upload or a publicly accessible media URL.
3. Open the site in another browser or a private window. The new post should be visible even while signed out, because published posts are public.
4. Create a second account with a different email. Like and comment on the first account's post, follow its creator, or send that creator a message.
5. Return to the first account. Shared activity should appear without reloading. If the network blocks Realtime, the app refreshes shared data in the background while the tab is visible.

In **Authentication → Users**, both emails should have different user IDs. In **Table Editor → profiles**, each account should have a profile with that same ID. Profiles and posts in this project—not local browser storage—are the source of the shared community.

## Verify the SQL installation

Run these in the same project's SQL Editor:

```sql
-- All 11 rows must have a non-null installed_table.
select table_name,
       to_regclass('public.' || table_name) as installed_table
from unnest(array[
  'profiles', 'posts', 'post_likes', 'reposts', 'saved_posts',
  'comments', 'follows', 'boards', 'board_posts', 'messages', 'message_reads'
]) as tables(table_name);

-- Must be zero; rerunning schema.sql repairs missing account profiles.
select count(*) as accounts_without_profiles
from auth.users as u
left join public.profiles as p on p.id = u.id
where p.id is null;

-- Expected: profiles, posts, post_likes, reposts, comments, follows, messages.
select tablename
from pg_publication_tables
where pubname = 'supabase_realtime' and schemaname = 'public'
order by tablename;
```

Supabase's Data API must be enabled with `public` in its exposed schemas. The schema installs row-level security: public reading does not grant visitors permission to post as someone else.

## Fix common setup problems

- **“Could not find the table 'public.profiles' in the schema cache”**: run the complete updated `schema.sql` in the project whose URL is set in Vercel. Check the 11 tables above. The file notifies PostgREST to refresh its cache after success. If needed, run `notify pgrst, 'reload schema';` after verifying the tables exist. This database-only fix does not need a Vercel redeployment.
- **“Database error saving new user” or a missing profile after sign-in**: rerun the complete updated SQL file. It replaces the signup trigger and repairs profiles for earlier accounts. Check Authentication logs if a signup still fails.
- **“Email not confirmed”**: open the confirmation email for that address and follow its link before signing in. Use **Resend confirmation email** on the sign-in form or check-email screen if necessary. Check spam and the project's email delivery/authentication logs.
- **An expired or invalid confirmation link**: the app shows a confirmation error. If your email is already verified, sign in. Otherwise enter your account email on the sign-in form and choose **Resend confirmation email**, then use the newest link.
- **Password reset link does not return to the app**: allow your site’s exact `/?auth=recovery` URL under Authentication → URL Configuration. Keep the Reset Password email template pointed at `{{ .ConfirmationURL }}`. Use the newest reset email; an ordinary signed-in session cannot replace a recovery link.
- **No confirmation email arrives**: check the project's Email provider, confirmation settings, SMTP setup, and rate-limit logs. Supabase must be allowed to send to the email address you used.
- **“Invalid login credentials”**: use the email/password created in this same Supabase project. A local demo profile is not an account. Confirm the email and check that Vercel points at the expected project.
- **Everyone still appears as Alex Carter / old demo posts appear**: open the normal site address without `?demo=1`, ensure both public environment variables exist, and deploy the latest GitHub code after setting them. Signing in must show the name on your own account. Existing real accounts can update their name under **Edit profile**.
- **A post appears only in one browser**: confirm you are signed into a real account, not the explicit sample experience. Check for the row in `public.posts` and that Vercel uses the same Supabase project in both browsers. Demo posts do not automatically become public posts.
- **Uploads fail**: the SQL creates a public `media` bucket with a 50 MB per-file limit. Upload while signed in; the client stores each file beneath your user ID. Large videos may require a paid storage plan or a smaller file. Do not weaken storage policies to allow anonymous writes.

Do not delete tables, disable row-level security, or publish a privileged key to fix an account problem. The updated setup is designed to work with the public key and individual authenticated users.

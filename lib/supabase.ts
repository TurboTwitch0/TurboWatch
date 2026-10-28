import { createClient, type Session, type SupabaseClient, type User } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  if (!client) {
    client = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return client;
}

export const liveBackendConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

/** Keep a password update bound to the account that verified the reset link. */
export async function updateRecoveryPassword(session: Session, password: string, assertCurrent: () => void): Promise<User> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Real account settings are unavailable.');
  const isolated = createClient(url, key, {
    auth: {
      // This client must never read, replace, refresh, or broadcast the main
      // browser session if another tab signs in while the request is pending.
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: `turbowatch-recovery-${crypto.randomUUID()}`,
    },
  });
  assertCurrent();
  const seeded = await isolated.auth.setSession({ access_token: session.access_token, refresh_token: session.refresh_token });
  assertCurrent();
  if (seeded.error) throw new Error(seeded.error.message);
  if (!seeded.data.user || seeded.data.user.id !== session.user.id) throw new Error('Your recovery session has ended. Request a new reset link.');
  const result = await isolated.auth.updateUser({ password });
  assertCurrent();
  if (result.error) throw new Error(result.error.message);
  if (!result.data.user || result.data.user.id !== session.user.id) throw new Error('The password change could not be confirmed. Please try again.');
  return result.data.user;
}

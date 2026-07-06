import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

/** Validate the Supabase session cookie and return the auth user (or null).
 *  Every API route MUST call this and key data by user.id — never trust
 *  client-supplied identifiers. */
export const DEV_USER = {
  id: '00000000-0000-4000-8000-000000001337',
  email: 'dev@astrealabs.com',
};

export async function getAuthUser() {
  // docker-compose dev mode: no Supabase auth server exists locally, so the
  // API trusts a fixed dev identity. Hard-disabled on Vercel.
  if (process.env.DEV_AUTH === '1' && !process.env.VERCEL) return DEV_USER;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  const store = await cookies();
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() { return store.getAll(); },
      setAll() { /* route handlers: session refresh writes are skipped */ },
    },
  });
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    // A missing/expired session is normal (no cookie -> AuthSessionMissingError)
    // and should stay quiet. But a transport/config error (Supabase auth host
    // unreachable, bad key) also lands here and would otherwise masquerade as a
    // plain 401 — log those so a 401-vs-500 confusion is diagnosable. Never log
    // cookie contents or the key.
    const status = error.status ?? null;
    const isMissingSession = error.name === 'AuthSessionMissingError' || status === 400 || status === 401;
    if (!isMissingSession) {
      console.error(
        '[auth] getUser error ' + JSON.stringify({
          code: 'AUTH',
          name: error.name || null,
          status,
          message: error.message || String(error),
        })
      );
    }
    return null;
  }
  return data.user ?? null;
}

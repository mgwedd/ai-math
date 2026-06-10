import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

/** Validate the Supabase session cookie and return the auth user (or null).
 *  Every API route MUST call this and key data by user.id — never trust
 *  client-supplied identifiers. */
export async function getAuthUser() {
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
  if (error) return null;
  return data.user ?? null;
}

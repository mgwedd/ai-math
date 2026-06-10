'use client';
import { createBrowserClient } from '@supabase/ssr';

let client = null;

/** Browser Supabase client (cookie-backed session so API routes see it).
 *  Returns null when env vars are missing (e.g. file:// standalone use). */
export function getSupabase() {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  client = createBrowserClient(url, key);
  return client;
}

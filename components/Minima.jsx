'use client';
/* Auth gate + thin React shell. Only authenticated users reach the game;
   the engine (lib/engine.js) is framework-free and mounts into the shell
   once a Supabase session exists. The API derives identity from the
   session cookie, so the client never sends a user identifier. */
import { useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase-browser';

const MIN_PASSWORD_LEN = 12;

/* Rough entropy estimate: length × log2(size of character classes in use).
   Length dominates — per NIST 800-63B we use no composition rules, just a
   floor and honest feedback. */
function passwordEntropy(pw) {
  if (!pw) return 0;
  let pool = 0;
  if (/[a-z]/.test(pw)) pool += 26;
  if (/[A-Z]/.test(pw)) pool += 26;
  if (/[0-9]/.test(pw)) pool += 10;
  if (/[^a-zA-Z0-9]/.test(pw)) pool += 33;
  return Math.round(pw.length * Math.log2(pool || 1));
}
function strength(bits) {
  if (bits >= 80) return { label: 'strong', color: 'var(--good)', pct: 100 };
  if (bits >= 60) return { label: 'decent', color: 'var(--gold)', pct: 70 };
  if (bits > 0)   return { label: 'weak',   color: 'var(--bad)',  pct: Math.max(12, bits) };
  return { label: '', color: 'transparent', pct: 0 };
}

function AuthGate() {
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [settled, setSettled] = useState(false);

  // let the entrance animation play once, then remove it entirely so
  // nothing (focus, autofill, re-renders) can ever replay it
  useEffect(() => {
    const t = setTimeout(() => setSettled(true), 450);
    return () => clearTimeout(t);
  }, []);

  const bits = passwordEntropy(password);
  const s = strength(bits);

  async function submit(e) {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) {
      setMsg({ kind: 'error', text: 'Auth is not configured — missing NEXT_PUBLIC_SUPABASE_URL / key.' });
      return;
    }
    if (mode === 'signup') {
      // mirrors the server policy (Supabase Auth settings): 12+ chars with
      // lower, upper, digit and symbol — fail fast with a clear message
      const missing = [
        [/[a-z]/, 'a lowercase letter'],
        [/[A-Z]/, 'an uppercase letter'],
        [/[0-9]/, 'a digit'],
        [/[^a-zA-Z0-9]/, 'a symbol'],
      ].filter(([re]) => !re.test(password)).map(([, what]) => what);
      if (password.length < MIN_PASSWORD_LEN || missing.length) {
        const parts = [];
        if (password.length < MIN_PASSWORD_LEN) parts.push(`at least ${MIN_PASSWORD_LEN} characters`);
        if (missing.length) parts.push('include ' + missing.join(', '));
        setMsg({ kind: 'error', text: 'Password needs ' + parts.join(' and ') + '.' });
        return;
      }
    }
    setBusy(true); setMsg(null);
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (!data.session) {
          setMsg({ kind: 'info', text: 'Account created — check your email for the confirmation link, then sign in.' });
        }
        // if confirmations are disabled, a session exists and the
        // auth listener in Minima flips straight into the game
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      setMsg({ kind: 'error', text: err.message || 'Authentication failed.' });
    }
    setBusy(false);
  }

  // Passkey (WebAuthn) sign-in: no email/password needed. Supabase runs the
  // full ceremony (navigator.credentials.get) and creates the session, after
  // which the auth listener in Minima drops the user into the game.
  async function passkeySignIn() {
    const supabase = getSupabase();
    if (!supabase) {
      setMsg({ kind: 'error', text: 'Auth is not configured — missing NEXT_PUBLIC_SUPABASE_URL / key.' });
      return;
    }
    setBusy(true); setMsg(null);
    try {
      const { error } = await supabase.auth.signInWithPasskey();
      if (error) throw error;
    } catch (err) {
      setMsg({ kind: 'error', text: err.message || 'Passkey sign-in failed or was cancelled.' });
    }
    setBusy(false);
  }

  // Google sign-in (OAuth). Full-page redirect to Google and back to the app
  // origin, where the browser client exchanges the code and the auth listener
  // enters the game. On success the page navigates away, so we only clear the
  // busy flag on error.
  async function googleSignIn() {
    const supabase = getSupabase();
    if (!supabase) {
      setMsg({ kind: 'error', text: 'Auth is not configured — missing NEXT_PUBLIC_SUPABASE_URL / key.' });
      return;
    }
    setBusy(true); setMsg(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
    } catch (err) {
      setMsg({ kind: 'error', text: err.message || 'Google sign-in failed.' });
      setBusy(false);
    }
  }

  return (
    <div className={'auth-landing auth-back' + (settled ? ' settled' : '')}>
      <form className="modal auth-card" onSubmit={submit}>
        <h2>{mode === 'signin' ? 'Sign in' : 'Create your account'}</h2>
        <p>
          {mode === 'signin'
            ? 'Continue where you left off — your progress is saved to your account.'
            : 'Save your XP, lessons, and quiz history across devices.'}
        </p>

        {/* Preferred: passkey (returning) then Google. Email is the fallback. */}
        <div className="auth-primary">
          {mode === 'signin' && (
            <button type="button" className="btn btn-social" disabled={busy} onClick={passkeySignIn}>
              🔑 Continue with a passkey
            </button>
          )}
          <button type="button" className="btn btn-social" disabled={busy} onClick={googleSignIn}>
            <GoogleMark /> Continue with Google
          </button>
        </div>

        <div className="auth-or"><span>or use your email</span></div>

        <input
          type="email" required placeholder="email"
          value={email} onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        <input
          type="password" required
          minLength={mode === 'signup' ? MIN_PASSWORD_LEN : undefined}
          placeholder={mode === 'signup' ? `password (min ${MIN_PASSWORD_LEN} chars)` : 'password'}
          value={password} onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
        />
        {mode === 'signup' && (
          <>
            <div className="pw-meter"><i style={{ width: s.pct + '%', background: s.color }} /></div>
            <p className="pw-hint">
              {password
                ? `~${bits} bits of entropy — ${s.label}.`
                : `${MIN_PASSWORD_LEN}+ characters with upper, lower, digit and symbol — e.g. a passphrase with a number and punctuation.`}
            </p>
          </>
        )}
        {msg && (
          <p style={{
            color: msg.kind === 'error' ? 'var(--bad)' : 'var(--good)',
            textAlign: 'left', marginTop: '-6px',
          }}>{msg.text}</p>
        )}
        <button className="btn btn-email" disabled={busy} type="submit">
          {busy ? '…' : mode === 'signin' ? 'Sign in with email →' : 'Create account with email →'}
        </button>
        <p style={{ marginTop: '14px', marginBottom: 0 }}>
          {mode === 'signin' ? 'New here? ' : 'Already registered? '}
          <a
            href="#" style={{ color: 'var(--accent2)' }}
            onClick={(e) => { e.preventDefault(); setMsg(null); setMode(mode === 'signin' ? 'signup' : 'signin'); }}
          >
            {mode === 'signin' ? 'Create an account' : 'Sign in'}
          </a>
        </p>
      </form>

      <section className="auth-hero">
        <div className="auth-logo"><span className="brand-mark">◈</span> <span className="brand-word">Minima</span></div>
        <h1>The <span>math foundations</span> beneath machine learning</h1>
        <p className="auth-lede">
          Work through the linear algebra, calculus, probability, and optimization
          that modern AI is built on — one hands-on lesson at a time. Every idea is
          an interactive lab you can poke at, not a wall of formulas.
        </p>
        <ul className="auth-topics">
          <li>🌌 <b>Linear algebra</b> — vectors, matrices, projections, SVD</li>
          <li>🌋 <b>Calculus</b> — gradients, convexity, optimization</li>
          <li>🎲 <b>Probability &amp; statistics</b> — distributions, inference, Bayes</li>
          <li>🤖 <b>Machine learning</b> — regression, trees, neural nets</li>
        </ul>
      </section>
    </div>
  );
}

// Official Google "G" mark, used on the Google sign-in button.
function GoogleMark() {
  return (
    <svg className="g-mark" width="17" height="17" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}

const DEV_MODE = process.env.NEXT_PUBLIC_DEV_AUTH === '1';
const DEV_SESSION = { user: { id: '00000000-0000-4000-8000-000000001337', email: 'dev@astrealabs.com' } };

export default function Minima() {
  const [session, setSession] = useState(undefined); // undefined = loading

  useEffect(() => {
    if (DEV_MODE) { setSession(DEV_SESSION); return; } // compose dev: no auth server
    const supabase = getSupabase();
    if (!supabase) { setSession(null); return; }
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: { subscription } } =
      supabase.auth.onAuthStateChange((_event, s) => setSession(s ?? null));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    const supabase = DEV_MODE ? null : getSupabase();
    (async () => {
      await import('@/lib/curriculum/index.js'); // registers lessons
      const { mount, setAuthLinkState } = await import('@/lib/engine.js');
      if (cancelled) return;
      mount({ // idempotent — safe under StrictMode double-invoke
        userLabel: (session.user.email || 'learner').split('@')[0],
        userEmail: session.user.email,
        storageKey: 'gradient-ascent-v1:' + session.user.id,
        onSignOut: DEV_MODE ? null : async () => {
          await getSupabase()?.auth.signOut();
          location.reload();
        },
        // Supabase manual linking: let an email/password learner attach their
        // Google identity. Full-page OAuth redirect; on return the browser
        // client exchanges the code and the auth-state effect re-runs.
        onLinkIdentity: supabase ? async () => {
          const { error } = await supabase.auth.linkIdentity({
            provider: 'google',
            options: { redirectTo: window.location.origin },
          });
          if (error) alert('Couldn’t start Google linking: ' + error.message);
        } : null,
        // Register a passkey (WebAuthn) for the signed-in learner. Supabase runs
        // the full ceremony (navigator.credentials.create) against the current
        // session; no redirect. A brief alert reports the outcome.
        onRegisterPasskey: supabase ? async () => {
          try {
            const { error } = await supabase.auth.registerPasskey();
            alert(error ? ('Couldn’t register a passkey: ' + error.message)
                        : 'Passkey registered — you can now sign in with it.');
          } catch (err) {
            alert('Couldn’t register a passkey: ' + (err?.message || err));
          }
        } : null,
      });
      // Reflect current identities in the account menu (which providers are
      // already linked). Only email-based accounts without Google see "Link".
      if (supabase) {
        try {
          const { data } = await supabase.auth.getUserIdentities();
          if (cancelled) return;
          const ids = data?.identities || [];
          const linked = ids.some((i) => i.provider === 'google');
          const hasEmail = ids.some((i) => i.provider === 'email');
          setAuthLinkState({ linked, linkable: hasEmail && !linked });
        } catch { /* linking UI simply stays hidden */ }
      }
    })();
    return () => { cancelled = true; };
  }, [session]);

  if (session === undefined) {
    return <div style={{ textAlign: 'center', padding: '42vh 0', color: 'var(--muted)' }}>loading…</div>;
  }
  if (!session) return <AuthGate />;

  return (
    <>
      <div id="app">
        <header>
          <div className="logo" onClick={() => window.go && window.go('home')}>
            <span className="brand-mark">◈</span> <span>Minima</span>
          </div>
          <div className="hud">
            <div className="xpbar-wrap">
              <div className="xpbar-label">
                <span id="lvl-title">Math Novice</span>
                <span id="xp-label">0 XP</span>
              </div>
              <div className="xpbar"><i id="xp-fill" style={{ width: '0%' }}></i></div>
            </div>
            <div className="hud-pill" title="Day streak"><span className="ico">🔥</span><span id="streak">1</span></div>
            <div className="hud-pill" title="Level"><span className="ico">⭐</span>Lv <span id="lvl-num">1</span></div>
            <div className="hud-pill" id="user-pill" style={{ display: 'none', cursor: 'pointer' }}>
              <span className="ico">👤</span><span id="user-name">—</span>
            </div>
            <div className="hud-pill" id="sync-pill" title="Progress storage">💾 local</div>
          </div>
        </header>
        <main id="view"></main>
        <footer>Minima · Learn the math behind AI by doing · progress syncs to your account</footer>
      </div>
      <div id="toasts"></div>
      <canvas id="fx"></canvas>
    </>
  );
}

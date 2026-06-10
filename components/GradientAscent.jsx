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
        // auth listener in GradientAscent flips straight into the game
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      setMsg({ kind: 'error', text: err.message || 'Authentication failed.' });
    }
    setBusy(false);
  }

  return (
    <div className={'modal-back auth-back' + (settled ? ' settled' : '')}>
      <form className="modal" onSubmit={submit}>
        <h2>📈 Gradient Ascent</h2>
        <p>
          {mode === 'signin'
            ? 'Sign in to continue your climb — XP, lessons and quiz history follow your account.'
            : 'Create an account to start the climb from vectors to gradients.'}
        </p>
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
        <button className="btn" disabled={busy} type="submit">
          {busy ? '…' : mode === 'signin' ? 'Sign in →' : 'Create account →'}
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
    </div>
  );
}

export default function GradientAscent() {
  const [session, setSession] = useState(undefined); // undefined = loading

  useEffect(() => {
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
    (async () => {
      await import('@/lib/curriculum/index.js'); // registers lessons
      const { mount } = await import('@/lib/engine.js');
      if (cancelled) return;
      mount({ // idempotent — safe under StrictMode double-invoke
        userLabel: (session.user.email || 'learner').split('@')[0],
        storageKey: 'gradient-ascent-v1:' + session.user.id,
        onSignOut: async () => {
          await getSupabase()?.auth.signOut();
          location.reload();
        },
      });
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
            📈 <span>Gradient Ascent</span>
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
        <footer>Gradient Ascent · Learn the math behind AI by doing · progress syncs to your account</footer>
      </div>
      <div id="toasts"></div>
      <canvas id="fx"></canvas>
    </>
  );
}

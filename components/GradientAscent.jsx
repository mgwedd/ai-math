'use client';
/* Thin React shell: renders the static skeleton, then mounts the
   framework-free canvas/DOM engine into it on the client. The engine
   owns everything inside <main id="view"> plus the HUD elements. */
import { useEffect } from 'react';

export default function GradientAscent() {
  useEffect(() => {
    (async () => {
      await import('@/lib/curriculum/index.js'); // registers lessons
      const { mount } = await import('@/lib/engine.js');
      mount(); // idempotent — safe under StrictMode double-invoke
    })();
  }, []);

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
            <div className="hud-pill" id="user-pill" style={{ display: 'none', cursor: 'pointer' }} title="Click to switch user">
              <span className="ico">👤</span><span id="user-name">—</span>
            </div>
            <div className="hud-pill" id="sync-pill" title="Progress storage">💾 local</div>
          </div>
        </header>
        <main id="view"></main>
        <footer>Gradient Ascent · Learn the math behind AI by doing · progress syncs to Postgres</footer>
      </div>
      <div id="toasts"></div>
      <canvas id="fx"></canvas>
    </>
  );
}

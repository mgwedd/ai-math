/* kb:promote script smoke tests (Vitest) — PR 7 hardening
   (docs/KNOWLEDGE-BASE-PLAN.md §4.3, §8 step 5, PR 7).
   ----------------------------------------------------------------
   scripts/kb-promote.mjs's --dry-run mode is KEYLESS AND DB-LESS by design
   (it never imports lib/db.js on that path, exactly like kb-generate.mjs), so
   it's exercised here as a real child process with a fully empty env — this
   is the strongest proof that no network or DB is touched: the test would
   hang/throw on a real connection attempt with no DATABASE_URL configured and
   no local Postgres reachable in CI. */
import { describe, it, expect } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const SCRIPT = fileURLToPath(new URL('../scripts/kb-promote.mjs', import.meta.url));

// Run with a minimal env (PATH only) so a real DB/network call would be
// immediately obvious (missing DATABASE_URL, no ANTHROPIC/WOLFRAM keys).
function run(args) {
  return execFileAsync('node', [SCRIPT, ...args], {
    env: { PATH: process.env.PATH },
    timeout: 10_000,
  });
}

describe('kb:promote --dry-run — keyless, DB-less', () => {
  it('prints a plan and exits 0 with no args', async () => {
    const { stdout } = await run(['--dry-run']);
    expect(stdout).toMatch(/DRY-RUN \(no DB connection, no writes\)/);
    expect(stdout).toMatch(/would query question_bank for status='verified'/);
    expect(stdout).toMatch(/DRY-RUN complete — no network, no DB connection, no writes\./);
  });

  it('respects --concept filter in the printed plan', async () => {
    const { stdout } = await run(['--dry-run', '--concept=dot-product']);
    expect(stdout).toMatch(/concept\s*: dot-product/);
    expect(stdout).toMatch(/AND concept='dot-product'/);
  });

  it('rejects an unknown concept slug before touching anything', async () => {
    await expect(run(['--dry-run', '--concept=not-a-real-concept'])).rejects.toMatchObject({
      code: 1,
    });
  });

  it('describes the auto-promote policy (thresholds, conservative default) with --auto', async () => {
    const { stdout } = await run(['--dry-run', '--auto']);
    expect(stdout).toMatch(/AUTO-PROMOTE min_verified=\d+ require_match=true/);
    expect(stdout).toMatch(/verification\.match === true/);
  });

  it('describes a single --promote plan without executing it', async () => {
    const { stdout } = await run(['--dry-run', '--promote=11111111-1111-1111-1111-111111111111']);
    expect(stdout).toMatch(/would UPDATE question_bank SET status='live'/);
  });

  it('describes a single --retire plan without executing it', async () => {
    const { stdout } = await run(['--dry-run', '--retire=11111111-1111-1111-1111-111111111111']);
    expect(stdout).toMatch(/would UPDATE question_bank SET status='retired'/);
  });
});

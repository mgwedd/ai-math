# ai-math — agent workflow notes

## Code knowledge base (graphify)

A Graphify code graph of this repo lives at `graphify-out/` (git-ignored;
symlinked into agent worktrees via `.claude/settings.json`). Build once per
clone with `graphify extract . --code-only` (local tree-sitter, no LLM key;
CLI installs via `uv tool install graphifyy`, lands in `~/.local/bin`).

**Prefer the kbase over blunt exploration.** For structure questions — who
calls/consumes a symbol, where something is defined, what belongs to a
module — run `graphify query "<symbol>"` before reaching for repo-wide grep
sweeps. Targeted `grep -n` on a file you already know is still fine.

**Freshness:** the graph reflects `main` at the last extract, not your
branch's uncommitted or new symbols — use grep/read for content introduced
by the diff you're working on. The `.githooks/post-merge` hook auto-rebuilds
the graph after pulls on the main checkout. If `graphify query` misses a
symbol you know landed on main, rebuild manually:

```bash
graphify extract . --code-only --force
```

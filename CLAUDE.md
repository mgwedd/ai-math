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
by the diff you're working on.

PRs merge on GitHub, so nothing refreshes locally at merge time: the graph
is only as fresh as the main checkout's last `git pull` (the
`.githooks/post-merge` hook rebuilds it on that pull, including
fast-forwards). Agents should self-heal staleness — before leaning on the
kbase, check whether the main checkout trails origin:

```bash
git -C /Users/wedd/dev/ai-math fetch origin main --quiet && git -C /Users/wedd/dev/ai-math rev-list --count HEAD..origin/main
```

If the count is non-zero and the main checkout is clean and on `main`, run
`git -C /Users/wedd/dev/ai-math pull --ff-only` — the hook then rebuilds the
graph automatically. If `graphify query` still misses a symbol you know
landed on main, rebuild manually from the main checkout:

```bash
graphify extract . --code-only --force
```

<div align="center">

# ◈ Minima

### Master AI Math Foundations

Learn the math behind modern AI — linear algebra, calculus, probability, and
machine learning — by **doing**, not reading. Every concept is an interactive
lab you can poke at.

[![CI](https://github.com/mgwedd/ai-math/actions/workflows/ci.yml/badge.svg)](https://github.com/mgwedd/ai-math/actions/workflows/ci.yml)
![Next.js](https://img.shields.io/badge/Next.js-App_Router-black)
![Supabase](https://img.shields.io/badge/Auth-Supabase-3ecf8e)
![Postgres](https://img.shields.io/badge/DB-Postgres-336791)

**[https://minima.astrealabs.com](https://minima.astrealabs.com)**  ·  [Architecture](docs/ARCHITECTURE.md)  ·  [Deployment](docs/DEPLOYMENT.md)

</div>

---

## What is Minima?

Minima is a free, interactive curriculum that teaches the **math foundations of
AI/ML** to engineers who can already code but want the math to actually *click*.

Instead of walls of formulas, every idea is a hands-on canvas lab:

- drag a vector and watch a dot product flip sign
- roll a ball down a loss surface to *feel* gradient descent
- nudge a prior and see the Bayesian posterior move
- train a tiny neural net in the browser and watch its decision boundary form

It's wrapped in light game mechanics — XP, levels, streaks, achievements, a
leaderboard — so momentum carries you from "what's a vector?" all the way to how
a neural network (and a transformer) actually works.

## How it works

Every lesson follows the same rhythm:

| | |
|---|---|
| 📖 **Learn** | a short, plain-English explanation |
| 🎛️ **Lab** | an interactive canvas with missions you complete by experimenting |
| ❓ **Quiz** | a few questions with targeted feedback on *why* a wrong answer is tempting |
| ✅ **Done** | earn XP, and the next lesson unlocks |

Your progress saves to your account and syncs across devices. Sign in with a
**passkey**, **Google**, or **email** — whichever you prefer.

## The curriculum

Five worlds and dozens of hands-on lessons, from arithmetic refreshers to
transformers:

| World | What you'll learn |
|---|---|
| 🌱 **World 0 — Foundations** | functions, slopes, exponents, logarithms, Σ-notation |
| 🌌 **World 1 — Linear Algebra** | vectors, matrices, dot products, projections, eigenvectors, SVD |
| 🌋 **World 2 — Calculus** | derivatives, gradients, the chain rule, convexity, optimization |
| 🎲 **World 3 — Probability & Statistics** | distributions, Bayes, expectation, entropy & KL, inference |
| 🤖 **World 4 — Machine Learning** | regression, logistic regression, trees, neural nets, backprop, attention |

Every lesson also has a **"why this matters for AI"** sidebar and optional
**go-deeper** cards for when you want to push further.

## Get started

The easiest way to use Minima is the **hosted version — free, no setup:**

### **→ [minima.astrealabs.com](https://minima.astrealabs.com)**

Register with a passkey, Google, or email and start learning. Your progress
syncs to your account and follows you across devices.

### Run it locally

Want to hack on it? The whole stack — app **and** Postgres — runs in Docker:

```bash
docker compose up --build
# → http://localhost:3000
```

This gives you a **fully working local instance with real persistence**: you're
auto-signed-in as a local dev user, and your progress is saved to the Docker
Postgres. It survives restarts (`docker compose down -v` resets it).

Prefer hot reload while editing? Run just the database in Docker and the app on
your machine (copy `.env.example` → `.env.local` first for the dev-auth vars and
DB connection string):

```bash
docker compose up db -d          # just Postgres
npm install
npm run dev
```

Run the tests (curriculum coherence checks — no database needed):

```bash
npm test
```

> **Local auth.** The compose stack bundles its own auth server, so you can
> **register and sign in with email/password entirely locally — no cloud
> account.** Your progress persists to the local Postgres and survives restarts.
> **Passkeys and Google stay cloud-only** (they need a public domain / OAuth
> credentials). Prefer zero-login hacking? An opt-in dev-user bypass is available
> too. Details and the self-host setup are in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Tech stack

- **Next.js (App Router)** — a deliberately thin React shell plus the API routes
- **A framework-free canvas engine** ([`lib/engine.js`](lib/engine.js)) that owns
  all post-login rendering — its own router, HUD, and game loop, in plain JS
- **Curriculum as pure data** — lessons are plain objects, so adding one is a
  data change, not an engine change
- **Supabase Auth** (passkeys / Google / email) + **Postgres**, with progress
  keyed per user and protected by row-level security

## Contributing

The curriculum is built to be easy to extend: a lesson is a pure-data object
registered with `registerLesson({ ... })`, and its interactive lab is a single
function. Progress is keyed by lesson `id`, so adding, removing, or reordering
lessons never corrupts anyone's saved state.

- New to the codebase? Start with **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** —
  the system overview, engine internals, and the lesson/lab schema.
- Deploying it yourself? See **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**.

## License

Not yet licensed — for now, all rights reserved. If you'd like to use or build
on Minima, please open an issue.

# shipdaily

> Autonomous app-a-day factory. Mine trends, generate spec, scaffold a Next.js + Supabase app, push to GitHub, deploy to Vercel. Every morning.

```
$ node src/cli.mjs full

[shipdaily] Mining trends...
Found 83 signals from HN, ProductHunt, r/webdev, r/SaaS, r/sideproject, r/indiehackers
  [hn       ] 1253  I've joined Anthropic
  [r/webdev ]  313  The entry level dev jobs are disappearing.
  ...

[shipdaily] Generating spec...
  Spec generated via Claude.

✓ Spec written: output/2026-05-20-entry-level-dev/SPEC.md
  App name: DevEntryBoard
  Pitch: A community-maintained list of junior dev openings, scraped weekly from companies who still hire entry level.
  Routes: 4
  Tables: 2

[shipdaily] Scaffolding app...
✓ App scaffolded — Next.js 14 + Supabase + Tailwind ready to deploy

[shipdaily] Deploying...
✓ Pushed to https://github.com/snedco/shipdaily-dev-entry-board
✓ Deployed to Vercel

──────────────────────────────────────────────
✓ shipdaily run complete: DevEntryBoard
──────────────────────────────────────────────
```

## What it does

Every morning at 9 AM CT, shipdaily:

1. **Mines trends** from Hacker News (top stories), ProductHunt (today's launches), and Reddit (r/webdev, r/SaaS, r/sideproject, r/indiehackers, r/startups)
2. **Picks the highest-signal trend** — filtered to remove news/funding/layoffs noise, ranked by normalized engagement
3. **Generates a complete product spec** using Claude — name, pitch, target user, core feature, data model with RLS, routes, monetization
4. **Scaffolds a production-ready Next.js 14 + Supabase + Tailwind project** with auth, RLS-protected CRUD, landing page, app page
5. **Pushes to GitHub** as a new public repo under your namespace
6. **Deploys to Vercel** in production
7. **Surfaces manual steps** for Supabase provisioning (until you wire SUPABASE_ACCESS_TOKEN)

30 apps a month. One hits. That one is a $10K/mo SaaS.

## Setup

```bash
git clone https://github.com/snedco/shipdaily.git
cd shipdaily
npm install
```

### Environment

| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Better spec generation via Claude Sonnet |
| `GH_TOKEN` / `gh` CLI auth | GitHub repo creation |
| `VERCEL_TOKEN` | Vercel deploys via CLI |
| `SUPABASE_ACCESS_TOKEN` | (Optional) Auto-create Supabase projects |

The CLI gracefully degrades if any of these are missing — it'll still scaffold, just with stubs and manual deploy steps.

## Usage

```bash
# Inspect today's signals
node src/cli.mjs trends

# Generate a spec from the top trend
node src/cli.mjs spec --trend "AI-powered X"

# Scaffold from a spec dir
node src/cli.mjs scaffold --path output/2026-05-20-some-app

# Deploy a scaffolded app
node src/cli.mjs deploy --path output/2026-05-20-some-app

# Full pipeline
node src/cli.mjs full

# Skip deploy step (test only)
node src/cli.mjs full --no-deploy
```

## Architecture

```
shipdaily/
├── src/
│   ├── cli.mjs        # Entry point
│   ├── trends.mjs     # HN + ProductHunt + Reddit
│   ├── spec.mjs       # Claude → JSON spec → markdown
│   ├── scaffold.mjs   # Spec → Next.js project files
│   └── deploy.mjs     # git + gh + vercel
│
├── output/            # Each day's apps go here
│   └── YYYY-MM-DD-slug/
│       ├── SPEC.md
│       ├── spec.json
│       ├── app/
│       ├── lib/
│       ├── schema.sql
│       └── ...
│
└── .github/workflows/
    └── daily.yml      # 9 AM CT daily ship
```

## Daily workflow (GitHub Actions)

The included workflow runs at 9 AM CT every day:

1. Mines trends
2. Generates spec via Claude
3. Scaffolds the app
4. Commits the scaffold to `output/` on main
5. (Optional) Triggers deploy to Vercel via `workflow_dispatch` with `deploy: yes`

To enable: push to GitHub, add `ANTHROPIC_API_KEY` to **Settings → Secrets**, done.

## Business model

The idea is volume, not perfection. Most apps will be mediocre. The point is:

- One day a week, you see something the trend miner picked up that *resonates*
- You take the scaffold and spend a day refining it into something real
- 1 of every 30 launches finds product-market fit
- That one pays for the whole year

Realistic numbers:
- 30 apps/mo at $0 marginal cost (you own GitHub/Vercel/Supabase free tiers)
- 1 hit/yr at $1K MRR = $12K/yr revenue
- Cost: 1 hour/day reviewing + occasional refinement
- ROI: positive in month 3

## License

MIT.

## Built by

[Lee Snedaker](https://stackio.ai), Austin, TX. Part of the Stackio.ai studio.

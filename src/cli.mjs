#!/usr/bin/env node
/**
 * shipdaily — autonomous app-a-day factory
 *
 * Pipeline:
 *   trends   → mine Hacker News, ProductHunt, Reddit for emerging signals
 *   spec     → pick one trend, generate an app spec (name, pitch, schema, routes)
 *   scaffold → write a Next.js + Supabase project from the spec
 *   deploy   → push to GitHub, create Vercel project, link Supabase
 *   full     → run all four in sequence
 *
 * Usage:
 *   node src/cli.mjs trends                    # just print today's signals
 *   node src/cli.mjs spec --trend "AI for X"   # generate spec for a trend
 *   node src/cli.mjs scaffold ./output/2026-05-20-trend-name
 *   node src/cli.mjs full                      # full daily pipeline
 */

import { mineTrends } from './trends.mjs';
import { generateSpec } from './spec.mjs';
import { scaffoldApp } from './scaffold.mjs';
import { deployApp } from './deploy.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'output');

function parseArgs(argv) {
  const cmd = argv[0];
  const args = { _cmd: cmd };
  for (let i = 1; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--trend') args.trend = argv[++i];
    else if (a === '--source') args.source = argv[++i];
    else if (a === '--path') args.path = argv[++i];
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '--no-deploy') args.noDeploy = true;
  }
  return args;
}

async function cmdTrends(args) {
  console.log('\n[shipdaily] Mining trends...\n');
  const trends = await mineTrends(args.source);
  console.log(`Found ${trends.length} signals:\n`);
  for (const t of trends.slice(0, 15)) {
    console.log(`  [${t.source.padEnd(10)}] ${t.score.toString().padStart(4)}  ${t.title.slice(0, 80)}`);
  }
  // Save to disk
  await mkdir(OUT_DIR, { recursive: true });
  const today = new Date().toISOString().slice(0, 10);
  await writeFile(join(OUT_DIR, `trends-${today}.json`), JSON.stringify(trends, null, 2), 'utf-8');
  console.log(`\n✓ Saved to output/trends-${today}.json`);
  return trends;
}

async function cmdSpec(args, trends) {
  console.log('\n[shipdaily] Generating spec...\n');
  if (!args.trend && (!trends || trends.length === 0)) {
    console.error('  No trend given and no trends available. Run "trends" first or pass --trend.');
    process.exit(1);
  }
  const trend = args.trend ?? trends[0]?.title;
  const trendObj = trends?.find(t => t.title === trend) ?? { title: trend, source: 'manual', score: 0 };

  const spec = await generateSpec(trendObj);

  const today = new Date().toISOString().slice(0, 10);
  const slug = spec.slug || trend.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
  const appDir = join(OUT_DIR, `${today}-${slug}`);
  await mkdir(appDir, { recursive: true });
  await writeFile(join(appDir, 'SPEC.md'), spec.markdown, 'utf-8');
  await writeFile(join(appDir, 'spec.json'), JSON.stringify(spec, null, 2), 'utf-8');

  console.log(`✓ Spec written: ${appDir}/SPEC.md`);
  console.log(`  App name: ${spec.name}`);
  console.log(`  Pitch: ${spec.pitch}`);
  console.log(`  Routes: ${spec.routes.length}`);
  console.log(`  Tables: ${spec.tables.length}`);
  return { spec, appDir };
}

async function cmdScaffold(args, appDir, spec) {
  console.log('\n[shipdaily] Scaffolding app...\n');
  const dir = args.path ?? appDir;
  if (!dir) {
    console.error('  No app dir given. Pass --path or run via "full".');
    process.exit(1);
  }
  await scaffoldApp(dir, spec);
  console.log(`✓ App scaffolded at: ${dir}`);
  return dir;
}

async function cmdDeploy(args, appDir, spec) {
  if (args.noDeploy) {
    console.log('\n[shipdaily] Skipping deploy (--no-deploy).');
    return;
  }
  console.log('\n[shipdaily] Deploying...\n');
  await deployApp(appDir, spec, { dryRun: args.dryRun });
  console.log(`✓ Deployed.`);
}

async function cmdFull(args) {
  // 1. Trends
  const trends = await cmdTrends(args);

  // 2. Spec
  args.trend = trends[0]?.title;
  const { spec, appDir } = await cmdSpec(args, trends);

  // 3. Scaffold
  await cmdScaffold(args, appDir, spec);

  // 4. Deploy
  await cmdDeploy(args, appDir, spec);

  console.log('\n──────────────────────────────────────────────');
  console.log(`✓ shipdaily run complete: ${spec.name}`);
  console.log(`  Location: ${appDir}`);
  console.log('──────────────────────────────────────────────\n');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const cmd = args._cmd;

  if (!cmd || cmd === '--help' || cmd === '-h') {
    console.log(`
shipdaily — autonomous app-a-day factory

Commands:
  trends                    Mine trends from HN / ProductHunt / Reddit
  spec --trend "..."        Generate an app spec from a trend
  scaffold --path DIR       Scaffold a Next.js+Supabase app from spec
  deploy --path DIR         Deploy to GitHub + Vercel
  full                      Run the full pipeline (trends → spec → scaffold → deploy)

Flags:
  --dry-run                 Print what would happen, don't write/deploy
  --no-deploy               Stop before deploy step
  --source <name>           HN | producthunt | reddit | all (default all)

Environment:
  ANTHROPIC_API_KEY         For spec generation
  GH_TOKEN / gh CLI auth    For repo creation
  VERCEL_TOKEN              For Vercel API deploys
  SUPABASE_ACCESS_TOKEN     For Supabase project creation (optional)
`);
    process.exit(0);
  }

  switch (cmd) {
    case 'trends':   await cmdTrends(args); break;
    case 'spec':     await cmdSpec(args); break;
    case 'scaffold': await cmdScaffold(args); break;
    case 'deploy':   await cmdDeploy(args); break;
    case 'full':     await cmdFull(args); break;
    default:
      console.error(`Unknown command: ${cmd}. Try --help.`);
      process.exit(1);
  }
}

main().catch(err => {
  console.error('FATAL:', err.message);
  if (process.env.DEBUG) console.error(err);
  process.exit(1);
});

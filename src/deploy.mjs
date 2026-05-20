/**
 * Deploy: push to GitHub + deploy to Vercel.
 *
 * Supabase creation requires the management API token; we'll surface manual instructions.
 */

import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

function sh(cmd, opts = {}) {
  return execSync(cmd, { stdio: 'inherit', ...opts });
}

function shSilent(cmd, opts = {}) {
  return execSync(cmd, { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf-8', ...opts }).trim();
}

export async function deployApp(appDir, spec, { dryRun = false } = {}) {
  const slug = spec.slug;
  const repoName = `shipdaily-${slug}`;

  console.log(`  Working in: ${appDir}`);
  console.log(`  Repo name:  ${repoName}`);

  if (dryRun) {
    console.log('  [DRY RUN] Would: git init → push to GitHub → vercel deploy');
    return { repo: repoName, dryRun: true };
  }

  // 1. Git init + commit
  if (!existsSync(join(appDir, '.git'))) {
    sh(`git init -b main`, { cwd: appDir });
  }
  sh(`git add -A`, { cwd: appDir });

  let needsCommit = true;
  try {
    shSilent(`git diff --cached --quiet`, { cwd: appDir });
    needsCommit = false; // nothing to commit
  } catch { /* there ARE staged changes, proceed */ }

  if (needsCommit) {
    sh(`git -c user.email="bot@stackio.ai" -c user.name="shipdaily-bot" commit -m "shipdaily: scaffold ${spec.name}"`, { cwd: appDir });
  }

  // 2. GitHub repo create + push (uses gh CLI auth)
  try {
    sh(`gh repo create snedco/${repoName} --public --source=. --description "${spec.tagline.replace(/"/g, "'")}" --push`, { cwd: appDir });
  } catch (e) {
    // Repo may already exist
    console.warn('  Repo create skipped (may already exist). Trying to set remote and push.');
    try { sh(`git remote add origin https://github.com/snedco/${repoName}.git`, { cwd: appDir }); } catch {}
    try { sh(`git push -u origin main`, { cwd: appDir }); } catch {}
  }

  // 3. Vercel deploy
  if (commandExists('vercel')) {
    try {
      sh(`vercel --yes --prod --name ${repoName} --scope stackio-projects`, { cwd: appDir });
      console.log(`  ✓ Deployed to Vercel`);
    } catch (e) {
      console.warn(`  Vercel deploy failed (you may need to run: vercel login). Skipping.`);
    }
  } else {
    console.log(`  Vercel CLI not found — install with: npm i -g vercel`);
  }

  // 4. Supabase: print instructions (full automation needs SUPABASE_ACCESS_TOKEN)
  console.log(`\n  Next manual steps:`);
  console.log(`    1. Create Supabase project: https://supabase.com/dashboard/new`);
  console.log(`    2. Run schema.sql in SQL editor`);
  console.log(`    3. Add NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY to Vercel`);
  console.log(`    4. Redeploy: cd ${appDir} && vercel --prod\n`);

  return { repo: `https://github.com/snedco/${repoName}` };
}

function commandExists(cmd) {
  try {
    if (process.platform === 'win32') {
      shSilent(`where ${cmd}`);
    } else {
      shSilent(`which ${cmd}`);
    }
    return true;
  } catch { return false; }
}

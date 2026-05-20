/**
 * Spec generator: turn a trend into a complete app spec.
 *
 * Uses Claude when ANTHROPIC_API_KEY is set; falls back to a templated stub.
 */

async function generateLLM(trend) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  let Anthropic;
  try {
    Anthropic = (await import('@anthropic-ai/sdk')).default;
  } catch {
    return null;
  }

  const client = new Anthropic({ apiKey });

  const prompt = `You are a senior product engineer shipping a tightly-scoped MVP today.

TREND / SIGNAL: "${trend.title}"
SOURCE: ${trend.source}  SCORE: ${trend.score}
URL: ${trend.url ?? 'n/a'}

Design a single-feature web app that uses this signal as its core insight.

Constraints:
- ONE core feature. No settings page. No nav. No marketing pages.
- Next.js 14 App Router + Supabase + Tailwind.
- Buildable in 1 day by one engineer.
- Must solve a real, narrow problem that the trend reveals.
- Monetizable: free tier + Stripe paid tier OR one-time payment.

Output ONLY a JSON object with this exact shape, no markdown:

{
  "name": "AppNameInPascalCase",
  "slug": "kebab-case-slug",
  "tagline": "One sentence pitch.",
  "pitch": "2-3 sentence problem statement + solution.",
  "target_user": "Who this is for (one line).",
  "core_feature": "The single thing the app does (one paragraph).",
  "monetization": "Free tier behavior + paid tier behavior + price.",
  "tables": [
    {
      "name": "table_name",
      "columns": [
        { "name": "id", "type": "uuid", "primary": true },
        { "name": "user_id", "type": "uuid", "references": "auth.users" },
        { "name": "field_name", "type": "text" }
      ],
      "rls": "Users can only see their own rows."
    }
  ],
  "routes": [
    { "path": "/", "purpose": "landing + login" },
    { "path": "/app", "purpose": "main feature, auth required" },
    { "path": "/api/...", "purpose": "API endpoint" }
  ],
  "stretch_features": ["one", "two", "three"]
}`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].text.trim();
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('LLM did not return JSON. Got: ' + text.slice(0, 200));
  return JSON.parse(match[0]);
}

function generateStub(trend) {
  const slug = trend.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30).replace(/-+$/, '');
  const name = slug.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('').slice(0, 24);
  return {
    name: name || 'TrendApp',
    slug: slug || 'trend-app',
    tagline: `An app responding to: "${trend.title}"`,
    pitch: `This MVP responds to the trend "${trend.title}" picked up from ${trend.source}. It does one thing well.`,
    target_user: 'Indie hackers, early adopters interested in this trend.',
    core_feature: 'Single-feature app. Replace this stub with the LLM-generated spec by setting ANTHROPIC_API_KEY.',
    monetization: 'Free for the first N uses, then $9/mo or $99 one-time.',
    tables: [
      {
        name: 'items',
        columns: [
          { name: 'id', type: 'uuid', primary: true },
          { name: 'user_id', type: 'uuid', references: 'auth.users' },
          { name: 'title', type: 'text' },
          { name: 'body', type: 'text' },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
        ],
        rls: 'Users see only their own rows.',
      },
    ],
    routes: [
      { path: '/', purpose: 'landing + login' },
      { path: '/app', purpose: 'main feature, auth required' },
      { path: '/api/items', purpose: 'CRUD endpoint' },
    ],
    stretch_features: ['Search', 'Tags', 'Export'],
  };
}

function specToMarkdown(spec) {
  const md = [];
  md.push(`# ${spec.name}`);
  md.push('');
  md.push(`> ${spec.tagline}`);
  md.push('');
  md.push(`**Slug:** \`${spec.slug}\``);
  md.push('');
  md.push(`## Pitch`);
  md.push(spec.pitch);
  md.push('');
  md.push(`## Target user`);
  md.push(spec.target_user);
  md.push('');
  md.push(`## Core feature`);
  md.push(spec.core_feature);
  md.push('');
  md.push(`## Monetization`);
  md.push(spec.monetization);
  md.push('');
  md.push(`## Data model`);
  for (const t of spec.tables) {
    md.push(`### \`${t.name}\``);
    md.push('');
    md.push('| Column | Type | Notes |');
    md.push('|---|---|---|');
    for (const c of t.columns) {
      const notes = [c.primary ? 'PK' : '', c.references ? `→ ${c.references}` : '', c.default ? `default \`${c.default}\`` : ''].filter(Boolean).join(' · ');
      md.push(`| \`${c.name}\` | \`${c.type}\` | ${notes} |`);
    }
    md.push('');
    md.push(`**RLS:** ${t.rls}`);
    md.push('');
  }
  md.push(`## Routes`);
  md.push('');
  md.push('| Path | Purpose |');
  md.push('|---|---|');
  for (const r of spec.routes) {
    md.push(`| \`${r.path}\` | ${r.purpose} |`);
  }
  md.push('');
  if (spec.stretch_features?.length) {
    md.push(`## Stretch features (not for MVP)`);
    md.push('');
    spec.stretch_features.forEach(f => md.push(`- ${f}`));
    md.push('');
  }
  return md.join('\n');
}

export async function generateSpec(trend) {
  let spec;
  try {
    spec = await generateLLM(trend);
    if (spec) console.log('  Spec generated via Claude.');
  } catch (e) {
    console.warn(`  LLM spec failed: ${e.message.slice(0, 80)}. Using stub.`);
  }
  if (!spec) spec = generateStub(trend);

  spec._trend = trend;
  spec.markdown = specToMarkdown(spec);
  return spec;
}

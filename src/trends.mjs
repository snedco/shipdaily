/**
 * Trend miner: pulls signals from Hacker News, ProductHunt, and Reddit.
 *
 * All public APIs, no auth required.
 */

const HN_BEST = 'https://hacker-news.firebaseio.com/v0/topstories.json';
const HN_ITEM = (id) => `https://hacker-news.firebaseio.com/v0/item/${id}.json`;
const REDDIT_SUBS = ['startups', 'SaaS', 'sideproject', 'webdev', 'EntrepreneurRideAlong', 'indiehackers'];

async function fetchJson(url) {
  const resp = await fetch(url, {
    headers: { 'User-Agent': 'shipdaily/1.0' },
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status} for ${url}`);
  return resp.json();
}

async function mineHN(limit = 30) {
  const ids = await fetchJson(HN_BEST);
  const top = ids.slice(0, limit);
  const items = await Promise.all(top.map(id => fetchJson(HN_ITEM(id)).catch(() => null)));
  return items.filter(Boolean).map(i => ({
    source: 'hn',
    title: i.title,
    url: i.url ?? `https://news.ycombinator.com/item?id=${i.id}`,
    score: i.score,
    comments: i.descendants ?? 0,
    posted_at: new Date(i.time * 1000).toISOString(),
  }));
}

async function mineReddit(limit = 10) {
  const all = [];
  for (const sub of REDDIT_SUBS) {
    try {
      const data = await fetchJson(`https://www.reddit.com/r/${sub}/top.json?t=day&limit=${limit}`);
      for (const item of data.data.children) {
        const p = item.data;
        all.push({
          source: `r/${sub}`,
          title: p.title,
          url: `https://reddit.com${p.permalink}`,
          score: p.score,
          comments: p.num_comments,
          posted_at: new Date(p.created_utc * 1000).toISOString(),
        });
      }
    } catch (e) {
      console.warn(`  Skipping r/${sub}: ${e.message}`);
    }
  }
  return all;
}

async function mineProductHunt(limit = 20) {
  // ProductHunt has a GraphQL API but requires auth. Use their public RSS instead.
  try {
    const resp = await fetch('https://www.producthunt.com/feed', { headers: { 'User-Agent': 'shipdaily/1.0' } });
    if (!resp.ok) return [];
    const xml = await resp.text();
    // Cheap XML parsing — pull <item> blocks
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let m;
    while ((m = itemRegex.exec(xml)) && items.length < limit) {
      const block = m[1];
      const title = (block.match(/<title>(?:<!\[CDATA\[)?([^\]<]+)(?:\]\]>)?<\/title>/) ?? [])[1];
      const link = (block.match(/<link>([^<]+)<\/link>/) ?? [])[1];
      const date = (block.match(/<pubDate>([^<]+)<\/pubDate>/) ?? [])[1];
      if (title) {
        items.push({
          source: 'ph',
          title: title.trim(),
          url: link?.trim(),
          score: 100, // PH doesn't give us upvotes via RSS
          comments: 0,
          posted_at: date ? new Date(date).toISOString() : null,
        });
      }
    }
    return items;
  } catch (e) {
    console.warn(`  ProductHunt skipped: ${e.message}`);
    return [];
  }
}

/**
 * Filter for "buildable" signals:
 *  - Not obvious infrastructure / corporate news (Amazon launches X)
 *  - Looks like a use case or a job-to-be-done
 *  - Has decent engagement
 */
function isBuildableSignal(trend) {
  const title = trend.title.toLowerCase();
  const blocklist = ['ipo', 'acquired', 'layoffs', 'funding round', 'lawsuit', 'shutdown'];
  if (blocklist.some(b => title.includes(b))) return false;
  // Pure infrastructure / framework noise
  if (/kubernetes|docker|rust|go 1\.\d|kernel|llvm/i.test(title) && trend.score < 200) return false;
  return true;
}

export async function mineTrends(source = 'all') {
  const sources = source === 'all' ? ['hn', 'reddit', 'ph'] : [source];
  const all = [];

  if (sources.includes('hn')) {
    try { all.push(...(await mineHN())); } catch (e) { console.warn('HN failed:', e.message); }
  }
  if (sources.includes('reddit')) {
    try { all.push(...(await mineReddit())); } catch (e) { console.warn('Reddit failed:', e.message); }
  }
  if (sources.includes('ph')) {
    try { all.push(...(await mineProductHunt())); } catch (e) { console.warn('ProductHunt failed:', e.message); }
  }

  // Filter + rank
  const filtered = all.filter(isBuildableSignal);

  // Normalize score across sources (HN runs 100-5000, Reddit 10-1000, PH unknown)
  for (const t of filtered) {
    if (t.source === 'hn') t.normalizedScore = t.score / 10;
    else if (t.source.startsWith('r/')) t.normalizedScore = t.score;
    else t.normalizedScore = 100; // PH default
  }

  filtered.sort((a, b) => b.normalizedScore - a.normalizedScore);
  return filtered;
}

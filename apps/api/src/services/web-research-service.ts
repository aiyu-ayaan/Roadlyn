type ResourceKind = 'officialDocs' | 'youtube' | 'github' | 'article' | 'course' | 'community';

export interface ResearchResource {
  kind: ResourceKind;
  title: string;
  url: string;
  source: string;
  summary?: string;
  freshnessRelevance: string;
  stars?: number | null;
  duration?: string | null;
  channelName?: string | null;
}

const SEARCH_LIMIT = 6;

export async function researchLearningResources(input: {
  topic: string;
  experienceLevel?: string;
  goal?: string;
}) {
  const base = `${input.topic} ${input.experienceLevel ?? ''} ${input.goal ?? ''}`.trim();
  const searches: Array<{ kind: ResourceKind; query: string }> = [
    { kind: 'officialDocs', query: `${base} official documentation docs latest 2026 current best practices` },
    { kind: 'youtube', query: `${base} YouTube long form tutorial crash course project 2025 2026` },
    { kind: 'github', query: `${base} GitHub repository examples projects stars 2025 2026` },
    { kind: 'article', query: `${base} tutorial guide best practices updated 2025 2026` },
    { kind: 'course', query: `${base} course curriculum learning path roadmap 2025 2026` },
    { kind: 'community', query: `${base} community recommendations reddit hacker news roadmap 2025 2026` },
  ];

  const resultSets = await Promise.all(
    searches.map(async (search) => {
      const results = await searchDuckDuckGo(search.query);
      return results.map((result) => ({
        ...result,
        kind: inferKind(result.url, search.kind),
        freshnessRelevance: inferFreshness(result.title, result.url),
      }));
    }),
  );

  const deduped = dedupeResources(resultSets.flat())
    .sort((a, b) => scoreResource(b) - scoreResource(a))
    .slice(0, 36);
  const withGithubMetadata = await Promise.all(
    deduped.map(async (resource) => {
      if (resource.kind !== 'github') {
        return resource;
      }

      return {
        ...resource,
        stars: await getGithubStars(resource.url),
      };
    }),
  );
  const enriched = await Promise.all(
    withGithubMetadata.map((resource, index) =>
      index < 14 ? enrichResourceFromPage(resource) : resource,
    ),
  );

  return enriched.sort((a, b) => scoreResource(b) - scoreResource(a));
}

function inferKind(url: string, fallback: ResourceKind): ResourceKind {
  const normalized = url.toLowerCase();

  if (normalized.includes('youtube.com') || normalized.includes('youtu.be')) return 'youtube';
  if (normalized.includes('github.com')) return 'github';
  if (
    normalized.includes('/docs') ||
    normalized.includes('docs.') ||
    normalized.includes('developer.') ||
    normalized.includes('learn.microsoft.com') ||
    normalized.includes('developer.mozilla.org')
  ) {
    return 'officialDocs';
  }

  return fallback;
}

async function searchDuckDuckGo(query: string): Promise<Omit<ResearchResource, 'kind' | 'freshnessRelevance'>[]> {
  const url = new URL('https://duckduckgo.com/html/');
  url.searchParams.set('q', query);

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; RoadlynLearningResearch/0.1)',
    },
  });

  if (!response.ok) {
    return [];
  }

  const html = await response.text();
  const matches = [...html.matchAll(/<div class="result[\s\S]*?<a rel="nofollow" class="result__a" href="([^"]+)">([\s\S]*?)<\/a>([\s\S]*?)(?=<div class="result|<\/body>)/g)];

  return matches.slice(0, SEARCH_LIMIT).map((match) => {
    const resultUrl = decodeDuckDuckGoUrl(decodeHtml(match[1]));
    const title = decodeHtml(stripTags(match[2])).trim();
    const summaryMatch = match[3].match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>|class="result__snippet"[^>]*>([\s\S]*?)<\/div>/);
    const summary = summaryMatch
      ? decodeHtml(stripTags(summaryMatch[1] ?? summaryMatch[2] ?? '')).trim()
      : undefined;

    return {
      title,
      url: resultUrl,
      source: getSourceName(resultUrl),
      summary: summary || undefined,
      stars: null,
      duration: null,
      channelName: inferYouTubeChannel(title, resultUrl),
    };
  }).filter((result) => result.title && result.url.startsWith('http'));
}

function decodeDuckDuckGoUrl(rawUrl: string) {
  const normalized = rawUrl.startsWith('//') ? `https:${rawUrl}` : rawUrl;

  try {
    const parsed = new URL(normalized);
    const target = parsed.searchParams.get('uddg');
    return target ? decodeURIComponent(target) : normalized;
  } catch {
    return normalized;
  }
}

async function getGithubStars(url: string) {
  const match = url.match(/github\.com\/([^/\s]+)\/([^/#?\s]+)/i);

  if (!match) {
    return null;
  }

  const [, owner, repo] = match;
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'RoadlynLearningResearchBot/0.1',
    },
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json() as { stargazers_count?: number };
  return data.stargazers_count ?? null;
}

async function enrichResourceFromPage(resource: ResearchResource): Promise<ResearchResource> {
  if (resource.kind === 'youtube' || resource.kind === 'github') {
    return resource;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);
    const response = await fetch(resource.url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RoadlynLearningResearch/0.1)',
      },
    });
    clearTimeout(timeout);

    const contentType = response.headers.get('content-type') ?? '';
    if (!response.ok || !contentType.includes('text/html')) {
      return resource;
    }

    const html = await response.text();
    const pageSummary = summarizeHtmlPage(html);

    if (!pageSummary) {
      return resource;
    }

    return {
      ...resource,
      summary: [resource.summary, pageSummary].filter(Boolean).join(' '),
    };
  } catch {
    return resource;
  }
}

function summarizeHtmlPage(html: string) {
  const description =
    readMetaContent(html, 'description') ??
    readMetaContent(html, 'og:description') ??
    readMetaContent(html, 'twitter:description');
  const headings = [...html.matchAll(/<h[12][^>]*>([\s\S]*?)<\/h[12]>/gi)]
    .map((match) => decodeHtml(stripTags(match[1])).trim())
    .filter(Boolean)
    .slice(0, 4);
  const parts = [
    description ? `Page description: ${decodeHtml(stripTags(description)).trim()}` : '',
    headings.length ? `Key headings: ${headings.join('; ')}` : '',
  ].filter(Boolean);

  return parts.join(' ').slice(0, 900);
}

function readMetaContent(html: string, name: string) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(
    `<meta[^>]+(?:name|property)=["']${escapedName}["'][^>]+content=["']([^"']+)["'][^>]*>|<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']${escapedName}["'][^>]*>`,
    'i',
  );
  const match = html.match(pattern);
  return match?.[1] ?? match?.[2];
}

function dedupeResources(resources: ResearchResource[]) {
  const seen = new Set<string>();

  return resources.filter((resource) => {
    const key = normalizeUrl(resource.url);

    if (seen.has(key) || isLowQuality(resource)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function normalizeUrl(url: string) {
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    parsed.search = '';
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return url;
  }
}

function isLowQuality(resource: ResearchResource) {
  const text = `${resource.title} ${resource.url}`.toLowerCase();
  return [
    'coupon',
    'answers',
    'cheat',
    'torrent',
    'download free course',
    'pdfcoffee',
    'scribd',
  ].some((term) => text.includes(term));
}

function scoreResource(resource: ResearchResource) {
  const url = resource.url.toLowerCase();
  let score = 0;

  if (resource.kind === 'officialDocs') score += 35;
  if (resource.kind === 'youtube') score += 28;
  if (resource.kind === 'github') score += 24;
  if (resource.kind === 'course') score += 18;
  if (resource.kind === 'article') score += 12;
  if (resource.kind === 'community') score += 8;
  if (url.includes('docs.') || url.includes('/docs') || url.includes('developer.')) score += 18;
  if (url.includes('learn.microsoft.com') || url.includes('developer.mozilla.org')) score += 18;
  if (url.includes('github.com')) score += 12;
  if (url.includes('youtube.com') || url.includes('youtu.be')) score += 12;
  if (url.includes('reddit.com') || url.includes('news.ycombinator.com')) score += 5;
  if (resource.title.match(/2025|2026|latest|updated/i)) score += 10;
  if (resource.stars) score += Math.min(20, Math.log10(resource.stars + 1) * 5);

  return score;
}

function inferFreshness(title: string, url: string) {
  const text = `${title} ${url}`;

  if (/2026/i.test(text)) return 'Explicitly references 2026 or current roadmap material.';
  if (/2025/i.test(text)) return 'Explicitly references 2025 and is likely current.';
  if (/latest|updated|modern|current/i.test(text)) return 'Signals current or actively updated guidance.';
  if (/docs|documentation|github\.com/i.test(text)) return 'Source is usually maintained as tooling evolves.';
  return 'No publication date found in search result; verify before relying on details.';
}

function getSourceName(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'web';
  }
}

function inferYouTubeChannel(title: string, url: string) {
  if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
    return null;
  }

  const parts = title.split(' - ');
  return parts.length > 1 ? parts[parts.length - 1].trim() : null;
}

function stripTags(value: string) {
  return value.replace(/<[^>]*>/g, ' ');
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ');
}

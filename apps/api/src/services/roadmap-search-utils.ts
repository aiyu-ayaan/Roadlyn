import { createHash } from 'crypto';

export interface RoadmapSearchMetadata {
  title: string;
  slug: string;
  normalizedTitle: string;
  searchableKeywords: string[];
  semanticTags: string[];
  searchPhrases: string[];
  searchVector: string;
  generationHash: string;
}

export interface SimilarityInput {
  topic: string;
  experienceLevel?: string;
  goal?: string;
  weeklyHours?: number;
}

export function normalizeSearchTerm(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ');
}

export function slugify(value: string) {
  return normalizeSearchTerm(value)
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

export function uniqueNormalizedTerms(values: string[]) {
  return [...new Set(values.map(normalizeSearchTerm).filter(Boolean))];
}

export function buildSearchVector(parts: {
  title: string;
  topic?: string;
  keywords: string[];
  tags: string[];
  phrases: string[];
}) {
  return uniqueNormalizedTerms([
    parts.title,
    parts.topic ?? '',
    ...parts.keywords,
    ...parts.tags,
    ...parts.phrases,
  ]).join(' ');
}

export function computeGenerationHash(input: SimilarityInput) {
  const payload = [
    normalizeSearchTerm(input.topic),
    normalizeSearchTerm(input.experienceLevel ?? ''),
    normalizeSearchTerm(input.goal ?? ''),
    String(input.weeklyHours ?? ''),
  ].join('|');

  return createHash('sha256').update(payload).digest('hex');
}

export function keywordOverlapScore(left: string[], right: string[]) {
  const a = new Set(left.map(normalizeSearchTerm));
  const b = new Set(right.map(normalizeSearchTerm));

  if (a.size === 0 || b.size === 0) {
    return 0;
  }

  let overlap = 0;

  for (const term of a) {
    if (b.has(term)) {
      overlap += 1;
    }
  }

  return overlap / Math.max(a.size, b.size);
}

export function cosineSimilarity(left: number[], right: number[]) {
  if (left.length === 0 || right.length === 0 || left.length !== right.length) {
    return 0;
  }

  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;

  for (let index = 0; index < left.length; index += 1) {
    dot += left[index] * right[index];
    leftNorm += left[index] * left[index];
    rightNorm += right[index] * right[index];
  }

  if (leftNorm === 0 || rightNorm === 0) {
    return 0;
  }

  return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
}

export function buildHeuristicMetadata(input: SimilarityInput): RoadmapSearchMetadata {
  const topic = normalizeSearchTerm(input.topic);
  const year = new Date().getFullYear();
  const level = input.experienceLevel
    ? `${input.experienceLevel.charAt(0).toUpperCase()}${input.experienceLevel.slice(1)} `
    : '';
  const title = `${level}${topic
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')} Engineering Roadmap ${year}`;
  const searchableKeywords = uniqueNormalizedTerms([
    topic,
    input.experienceLevel ?? '',
    input.goal ?? '',
    'roadmap',
    'course',
    'learning path',
  ]);
  const semanticTags = uniqueNormalizedTerms([
    topic,
    input.experienceLevel ?? 'general',
    'engineering',
    'curriculum',
  ]);
  const searchPhrases = uniqueNormalizedTerms([
    `${topic} roadmap`,
    `${topic} course`,
    `learn ${topic}`,
    input.goal ?? '',
  ]);

  return {
    title,
    slug: slugify(`${topic}-${year}`),
    normalizedTitle: normalizeSearchTerm(title),
    searchableKeywords,
    semanticTags,
    searchPhrases,
    searchVector: buildSearchVector({
      title,
      topic: input.topic,
      keywords: searchableKeywords,
      tags: semanticTags,
      phrases: searchPhrases,
    }),
    generationHash: computeGenerationHash(input),
  };
}

export function parseMetadataJson(text: string, input: SimilarityInput): RoadmapSearchMetadata {
  const parsed = JSON.parse(text) as {
    title?: string;
    slug?: string;
    searchableKeywords?: string[];
    semanticTags?: string[];
    searchPhrases?: string[];
  };

  const title = parsed.title?.trim() || buildHeuristicMetadata(input).title;
  const searchableKeywords = uniqueNormalizedTerms([
    input.topic,
    ...(parsed.searchableKeywords ?? []),
    ...(parsed.searchPhrases ?? []),
  ]);
  const semanticTags = uniqueNormalizedTerms([
    input.topic,
    ...(parsed.semanticTags ?? []),
  ]);
  const searchPhrases = uniqueNormalizedTerms(parsed.searchPhrases ?? []);
  const slug = slugify(parsed.slug?.trim() || title);

  return {
    title,
    slug,
    normalizedTitle: normalizeSearchTerm(title),
    searchableKeywords,
    semanticTags,
    searchPhrases,
    searchVector: buildSearchVector({
      title,
      topic: input.topic,
      keywords: searchableKeywords,
      tags: semanticTags,
      phrases: searchPhrases,
    }),
    generationHash: computeGenerationHash(input),
  };
}

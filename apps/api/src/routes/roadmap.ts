import { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { requireScope } from '../middleware/auth';
import { AIGatewayService } from '../services/ai-gateway-service';
import { ResearchResource, researchLearningResources } from '../services/web-research-service';
import { ApiError } from '../utils/errors';

const generateSchema = z.object({
  topic: z.string().min(1),
  experienceLevel: z.string().optional(),
  goal: z.string().optional(),
  weeklyHours: z.number().int().positive().max(80).optional(),
  moduleCount: z.number().int().min(4).max(6).default(6),
  courseDepth: z.enum(['standard', 'full-length', 'masterclass']).default('masterclass'),
  generationOptions: z.object({
    liveSearch: z.boolean().default(true),
    youtubeVideos: z.boolean().default(true),
    githubRepos: z.boolean().default(true),
    officialDocs: z.boolean().default(true),
    projects: z.boolean().default(true),
    quizzes: z.boolean().default(true),
    interviewPrep: z.boolean().default(true),
    summaries: z.boolean().default(true),
    certifications: z.boolean().default(true),
  }).default({}),
  providerId: z.string().optional(),
  modelId: z.string().optional(),
  useUserDefaults: z.boolean().default(false),
});

type GenerateInput = z.infer<typeof generateSchema>;
type AIGenerateResult = Awaited<ReturnType<AIGatewayService['generateText']>>;
type ResourceKind = ResearchResource['kind'];

interface PhaseResourceState {
  usedKeys: Set<string>;
  cursors: Record<ResourceKind, number>;
}

interface AgentCourseBundle {
  curriculum: unknown;
  portfolio: unknown;
  result: AIGenerateResult;
}

const DEFAULT_GENERATION_OPTIONS: GenerateInput['generationOptions'] = {
  liveSearch: true,
  youtubeVideos: true,
  githubRepos: true,
  officialDocs: true,
  projects: true,
  quizzes: true,
  interviewPrep: true,
  summaries: true,
  certifications: true,
};

interface RoadmapRecord {
  id: string;
  userId: string;
  title: string;
  topic: string | null;
  experienceLevel: string | null;
  goal: string | null;
  weeklyHours: number | null;
  status: string;
  progress: number;
  generatedCourse: unknown;
  researchedResources: unknown;
  providerId: string | null;
  modelId: string | null;
  errorMessage: string | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export async function roadmapRoutes(fastify: FastifyInstance) {
  const gateway = new AIGatewayService(fastify.db, fastify.redis);

  fastify.get('/roadmaps', {
    preHandler: requireScope('ai:read'),
    schema: {
      tags: ['Roadmaps'],
      summary: 'List roadmaps for the authenticated user',
      security: [{ bearerAuth: [] }],
    },
  }, async (request) => {
    if (!request.auth?.userId) {
      return { success: true, data: [] };
    }

    const roadmaps = await fastify.db.$queryRawUnsafe<RoadmapRecord[]>(
      `SELECT "id", "title", "topic", "status", "progress", "errorMessage", "completedAt", "createdAt", "updatedAt"
       FROM "Roadmap"
       WHERE "userId" = $1
       ORDER BY "updatedAt" DESC`,
      request.auth.userId,
    );

    return { success: true, data: roadmaps };
  });

  fastify.get('/roadmaps/:id', {
    preHandler: requireScope('ai:read'),
    schema: {
      tags: ['Roadmaps'],
      summary: 'Get a generated roadmap course',
      security: [{ bearerAuth: [] }],
    },
  }, async (request) => {
    if (!request.auth?.userId) {
      throw new ApiError(403, 'USER_SESSION_REQUIRED', 'Roadmap details require a user session');
    }

    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    const [roadmap] = await fastify.db.$queryRawUnsafe<RoadmapRecord[]>(
      `SELECT *
       FROM "Roadmap"
       WHERE "id" = $1 AND "userId" = $2
       LIMIT 1`,
      params.id,
      request.auth.userId,
    );

    if (!roadmap) {
      throw new ApiError(404, 'ROADMAP_NOT_FOUND', 'Roadmap not found');
    }

    if (
      roadmap.status === 'FAILED' &&
      !roadmap.generatedCourse &&
      Array.isArray(roadmap.researchedResources)
    ) {
      const fallbackCourse = buildFallbackCourse(
        {
          topic: roadmap.topic ?? roadmap.title,
          experienceLevel: roadmap.experienceLevel ?? undefined,
          goal: roadmap.goal ?? undefined,
          weeklyHours: roadmap.weeklyHours ?? undefined,
          moduleCount: 6,
          courseDepth: 'masterclass',
          generationOptions: DEFAULT_GENERATION_OPTIONS,
          useUserDefaults: true,
        },
        roadmap.researchedResources as ResearchResource[],
      );

      await updateRoadmapJob(fastify, roadmap.id, {
        title: fallbackCourse.title,
        status: 'COMPLETED',
        progress: 100,
        generatedCourse: fallbackCourse,
        errorMessage: roadmap.errorMessage
          ? `AI provider failed earlier, so Roadlyn recovered this course from scraped research: ${roadmap.errorMessage}`
          : 'AI provider failed earlier, so Roadlyn recovered this course from scraped research.',
        completedAt: new Date(),
      });

      return {
        success: true,
        data: {
          ...roadmap,
          title: fallbackCourse.title,
          status: 'COMPLETED',
          progress: 100,
          generatedCourse: fallbackCourse,
          errorMessage: roadmap.errorMessage
            ? `AI provider failed earlier, so Roadlyn recovered this course from scraped research: ${roadmap.errorMessage}`
            : 'AI provider failed earlier, so Roadlyn recovered this course from scraped research.',
          completedAt: new Date(),
        },
      };
    }

    return { success: true, data: roadmap };
  });

  fastify.delete('/roadmaps/:id', {
    preHandler: requireScope('ai:write'),
    schema: {
      tags: ['Roadmaps'],
      summary: 'Delete a generated roadmap',
      security: [{ bearerAuth: [] }],
    },
  }, async (request) => {
    if (!request.auth?.userId) {
      throw new ApiError(403, 'USER_SESSION_REQUIRED', 'Deleting a roadmap requires a user session');
    }

    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    const deleted = await fastify.db.roadmap.deleteMany({
      where: {
        id: params.id,
        userId: request.auth.userId,
      },
    });

    if (deleted.count === 0) {
      throw new ApiError(404, 'ROADMAP_NOT_FOUND', 'Roadmap not found');
    }

    return { success: true, data: { id: params.id } };
  });

  fastify.get('/roadmaps/resource-preview', {
    preHandler: requireScope('ai:read'),
    schema: {
      tags: ['Roadmaps'],
      summary: 'Fetch a static in-app preview for a researched resource',
      security: [{ bearerAuth: [] }],
    },
  }, async (request) => {
    const query = z.object({ url: z.string().url() }).parse(request.query);
    const preview = await fetchResourcePreview(query.url);

    return { success: true, data: preview };
  });

  fastify.post('/roadmaps/generate', {
    preHandler: requireScope('ai:write'),
    schema: {
      tags: ['Roadmaps'],
      summary: 'Generate a roadmap from live web research through the dynamic AI gateway',
      security: [{ bearerAuth: [] }],
    },
  }, async (request) => {
    if (!request.auth?.userId) {
      throw new ApiError(403, 'USER_SESSION_REQUIRED', 'Background roadmap generation requires a user session');
    }

    const input = generateSchema.parse(request.body);
    const roadmapId = randomUUID();
    const [roadmap] = await fastify.db.$queryRawUnsafe<RoadmapRecord[]>(
      `INSERT INTO "Roadmap"
        ("id", "userId", "title", "topic", "experienceLevel", "goal", "weeklyHours", "status", "progress", "providerId", "modelId", "createdAt", "updatedAt")
       VALUES
        ($1, $2, $3, $4, $5, $6, $7, 'QUEUED', 5, $8, $9, NOW(), NOW())
       RETURNING "id", "title", "topic", "status", "progress", "createdAt", "updatedAt"`,
      roadmapId,
      request.auth.userId,
      `${input.topic} roadmap`,
      input.topic,
      input.experienceLevel ?? null,
      input.goal ?? null,
      input.weeklyHours ?? null,
      input.providerId ?? null,
      input.modelId ?? null,
    );

    void runRoadmapGenerationJob({
      fastify,
      gateway,
      roadmapId: roadmap.id,
      userId: request.auth.userId,
      input,
    });

    return {
      success: true,
      data: {
        roadmapId: roadmap.id,
        roadmap,
        status: roadmap.status,
      },
    };
  });
}

async function runRoadmapGenerationJob(input: {
  fastify: FastifyInstance;
  gateway: AIGatewayService;
  roadmapId: string;
  userId: string;
  input: GenerateInput;
}) {
  const { fastify, gateway, roadmapId, userId } = input;

  try {
    await updateRoadmapJob(fastify, roadmapId, {
      status: 'RUNNING',
      progress: 15,
    });

    const researchedResources = await researchLearningResources({
      topic: input.input.topic,
      experienceLevel: input.input.experienceLevel,
      goal: input.input.goal,
    });

    await updateRoadmapJob(fastify, roadmapId, {
      researchedResources,
      progress: 45,
    });

    let aiError: unknown;
    const agentBundle = await generateCourseWithAgents({
      gateway,
      userId,
      input: input.input,
      researchedResources,
    }).catch((error: unknown) => {
      aiError = error;
      return null;
    });
    const course = agentBundle
      ? normalizeGeneratedCourse(composeCourseFromAgentBundle(agentBundle), input.input, researchedResources)
      : buildFallbackCourse(input.input, researchedResources);

    await updateRoadmapJob(fastify, roadmapId, {
      title: course.title,
      status: 'COMPLETED',
      progress: 100,
      generatedCourse: course,
      researchedResources,
      providerId: agentBundle?.result.providerId,
      modelId: agentBundle?.result.modelId,
      errorMessage: aiError
        ? `AI provider was temporarily unavailable, so Roadlyn generated this course from scraped research: ${getErrorMessage(aiError)}`
        : undefined,
      completedAt: new Date(),
    });
  } catch (error) {
    await updateRoadmapJob(fastify, roadmapId, {
      status: 'FAILED',
      progress: 100,
      errorMessage: error instanceof Error ? error.message : 'Roadmap generation failed',
    });

    fastify.log.error(error);
  }
}

async function generateCourseWithAgents(input: {
  gateway: AIGatewayService;
  userId: string;
  input: GenerateInput;
  researchedResources: ResearchResource[];
}): Promise<AgentCourseBundle> {
  const [curriculum, portfolio] = await Promise.all([
    generateAgentWithRetries({
      ...input,
      operation: 'roadmap.agent.curriculum',
      prompt: buildCurriculumAgentPrompt(input.input, input.researchedResources),
    }),
    generateAgentWithRetries({
      ...input,
      operation: 'roadmap.agent.portfolio',
      prompt: buildPortfolioAgentPrompt(input.input, input.researchedResources),
    }),
  ]);
  const curriculumJson = extractJson(curriculum.text);
  const portfolioJson = extractJson(portfolio.text);

  return {
    curriculum: curriculumJson,
    portfolio: portfolioJson,
    result: curriculum,
  };
}

async function generateAgentWithRetries(input: {
  gateway: AIGatewayService;
  userId: string;
  input: GenerateInput;
  operation: string;
  prompt: string;
}) {
  const maxAttempts = 3;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await input.gateway.generateText({
        userId: input.userId,
        providerId: input.input.providerId,
        modelId: input.input.modelId,
        useUserDefaults: input.input.useUserDefaults,
        operation: input.operation,
        system: buildCourseSystemPrompt(),
        prompt: input.prompt,
      });
    } catch (error) {
      lastError = error;

      if (!isRetryableAIError(error) || attempt === maxAttempts) {
        throw error;
      }

      await delay(1500 * attempt);
    }
  }

  throw lastError;
}

function isRetryableAIError(error: unknown) {
  const text = getErrorMessage(error).toLowerCase();
  return (
    text.includes('429') ||
    text.includes('rate limit') ||
    text.includes('rate-limited') ||
    text.includes('temporarily') ||
    text.includes('retry')
  );
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return 'Unknown AI provider error';
  }
}

function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function fetchResourcePreview(url: string) {
  const parsed = parsePreviewUrl(url);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);

  try {
    const response = await fetch(parsed.toString(), {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RoadlynResourcePreview/0.1)',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    const contentType = response.headers.get('content-type') ?? '';
    if (!response.ok || !contentType.includes('text/html')) {
      return {
        url: parsed.toString(),
        title: parsed.hostname,
        html: buildPreviewFallbackHtml(parsed.toString(), 'This resource cannot be rendered as a static page preview.'),
      };
    }

    const html = await response.text();
    return {
      url: parsed.toString(),
      title: readHtmlTitle(html) ?? parsed.hostname,
      html: sanitizePreviewHtml(html, parsed),
    };
  } finally {
    clearTimeout(timeout);
  }
}

function parsePreviewUrl(url: string) {
  const parsed = new URL(url);
  if (!['http:', 'https:'].includes(parsed.protocol) || isBlockedPreviewHost(parsed.hostname)) {
    throw new ApiError(400, 'RESOURCE_PREVIEW_URL_BLOCKED', 'This resource URL cannot be previewed');
  }

  return parsed;
}

function isBlockedPreviewHost(hostname: string) {
  const host = hostname.toLowerCase();
  return (
    host === 'localhost' ||
    host === '0.0.0.0' ||
    host === '127.0.0.1' ||
    host.endsWith('.local') ||
    host.startsWith('10.') ||
    host.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
  );
}

function sanitizePreviewHtml(html: string, baseUrl: URL) {
  const withoutScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<meta[^>]+http-equiv=["']?content-security-policy["']?[^>]*>/gi, '');
  const withBase = withoutScripts.replace(
    /<head([^>]*)>/i,
    `<head$1><base href="${escapeHtml(baseUrl.origin)}">`,
  );

  if (withBase !== withoutScripts) {
    return withBase;
  }

  return `<!doctype html><html><head><base href="${escapeHtml(baseUrl.origin)}"></head><body>${withoutScripts}</body></html>`;
}

function readHtmlTitle(html: string) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? decodeHtml(stripTags(match[1])).trim() : null;
}

function buildPreviewFallbackHtml(url: string, message: string) {
  return [
    '<!doctype html><html><head><style>',
    'body{font-family:system-ui,sans-serif;background:#0b0f17;color:#d8dee9;margin:0;display:grid;min-height:100vh;place-items:center}',
    'main{max-width:680px;padding:32px;line-height:1.6} code{color:#8ab4ff;word-break:break-all}',
    '</style></head><body><main>',
    `<h1>Static preview unavailable</h1><p>${escapeHtml(message)}</p><p><code>${escapeHtml(url)}</code></p>`,
    '</main></body></html>',
  ].join('');
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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

async function updateRoadmapJob(
  fastify: FastifyInstance,
  roadmapId: string,
  data: {
    title?: string;
    status?: string;
    progress?: number;
    generatedCourse?: unknown;
    researchedResources?: unknown;
    providerId?: string;
    modelId?: string;
    errorMessage?: string;
    completedAt?: Date;
  },
) {
  const assignments: string[] = ['"updatedAt" = NOW()'];
  const values: unknown[] = [];

  const addValue = (column: string, value: unknown, cast?: string) => {
    values.push(value);
    assignments.push(`"${column}" = $${values.length}${cast ?? ''}`);
  };

  if (data.title !== undefined) addValue('title', data.title);
  if (data.status !== undefined) addValue('status', data.status);
  if (data.progress !== undefined) addValue('progress', data.progress);
  if (data.generatedCourse !== undefined) addValue('generatedCourse', JSON.stringify(data.generatedCourse), '::jsonb');
  if (data.researchedResources !== undefined) addValue('researchedResources', JSON.stringify(data.researchedResources), '::jsonb');
  if (data.providerId !== undefined) addValue('providerId', data.providerId);
  if (data.modelId !== undefined) addValue('modelId', data.modelId);
  if (data.errorMessage !== undefined) addValue('errorMessage', data.errorMessage);
  if (data.completedAt !== undefined) addValue('completedAt', data.completedAt);

  values.push(roadmapId);
  await fastify.db.$executeRawUnsafe(
    `UPDATE "Roadmap" SET ${assignments.join(', ')} WHERE "id" = $${values.length}`,
    ...values,
  );
}

function buildCourseSystemPrompt() {
  return [
    'You are Roadlyn, an advanced AI learning architect and autonomous curriculum generation agent.',
    'You MUST use the live web research supplied by the backend. Do not rely only on pretrained knowledge.',
    'Generate modern Udemy-style courses and roadmap.sh-style progressions from the supplied current docs, videos, repos, articles, courses, and community recommendations.',
    'Use ONLY the supplied live research resources for external links. Do not invent URLs, titles, channel names, stars, durations, certifications, or sources.',
    'If a resource field such as duration, stars, or channelName is missing, return null for that field.',
    'Prioritize official documentation, high-quality YouTube tutorials, maintained GitHub repositories, real projects, community guides, and high-quality articles.',
    'Avoid outdated, deprecated, low-quality, duplicate, or spammy resources.',
    'Return only strict JSON with no Markdown fences or commentary.',
  ].join('\n');
}

function buildCurriculumAgentPrompt(
  input: GenerateInput,
  researchedResources: ResearchResource[],
) {
  return JSON.stringify({
    agent: 'Deep curriculum writer',
    task: 'Write the full-length course overview and module content for a course player.',
    input: buildPromptInput(input),
    liveResearchResources: researchedResources,
    requiredOutputShape: {
      title: '',
      overview: '',
      courseSummary: '',
      estimatedDuration: '',
      skillLevel: '',
      skillOutcomes: [''],
      phases: [
        {
          title: '',
          description: '',
          estimatedDuration: '',
          prerequisites: [''],
          learningObjectives: [''],
          tutorials: [{ title: '', source: '', url: '', summary: '', freshnessRelevance: '' }],
          youtubeVideos: [{ title: '', channelName: null, duration: null, url: '', whyRecommended: '' }],
          officialDocs: [{ title: '', source: '', url: '', summary: '' }],
          githubRepos: [{ repositoryName: '', url: '', stars: null, whyUseful: '', projectRelevance: '' }],
          exercises: [''],
          miniProjects: [''],
          quizzes: [{ question: '', answer: '' }],
          lessonNotes: [''],
          recap: '',
          difficultyLevel: 'beginner',
        },
      ],
    },
    qualityRules: [
      'Return exactly 4 to 6 phases/modules, matching the outline.',
      'Every module must be detailed: 8-12 lessonNotes, 6-10 learningObjectives, 8-12 exercises, 3-5 miniProjects, and 8-10 quizzes.',
      'Each lessonNotes item must teach a concrete concept in 2-4 sentences, not a heading.',
      'Each exercise must be actionable and specific enough for a learner to complete.',
      'Use ONLY URLs from liveResearchResources. Do not invent links.',
      'Every module should include at least one youtubeVideos item when YouTube resources exist in liveResearchResources.',
      'Prefer YouTube URLs that can be embedded, official docs, GitHub repos with practical code, and useful articles.',
      'Do not copy Phase 1 resources into Phase 2 or later modules. Resource URLs must be unique across the whole course unless there are not enough live resources.',
      'Avoid repeating the same lesson notes across modules. Each module must teach a distinct part of the topic.',
      'Return strict JSON only.',
    ],
    enabledGenerationTasks: input.generationOptions,
  });
}

function buildPortfolioAgentPrompt(
  input: GenerateInput,
  researchedResources: ResearchResource[],
) {
  return JSON.stringify({
    agent: 'Portfolio, assessment, and interview coach',
    task: 'Create the projects, milestones, certifications, interview prep, and recommended tools for the course.',
    input: buildPromptInput(input),
    liveResearchResources: researchedResources,
    requiredOutputShape: {
      projects: [
        {
          title: '',
          level: 'beginner',
          description: '',
          deliverables: [''],
          realWorldScenario: '',
        },
      ],
      resources: researchedResources,
      interviewPrep: [
        {
          topic: '',
          concepts: [''],
          practicalQuestions: [''],
          portfolioSuggestion: '',
        },
      ],
      certifications: [{ title: '', provider: '', url: null, relevance: '' }],
      recommendedTools: [''],
      milestones: [{ week: '', outcome: '', checkpoint: '' }],
    },
    qualityRules: [
      'Create 4-6 substantial projects that map to the 4-6 modules, including one capstone.',
      'Each project must include 5-8 deliverables and a realistic professional scenario.',
      'Create milestones for the whole full-length course, not just a short crash course.',
      'Create interview prep with 5-8 concepts and 8-12 practical questions per topic.',
      'Use ONLY URLs from liveResearchResources for certifications when a URL is provided.',
      'Return strict JSON only.',
    ],
  });
}

function buildPromptInput(input: GenerateInput) {
  return {
    topic: input.topic,
    experienceLevel: input.experienceLevel ?? 'beginner',
    goal: input.goal ?? 'Become practical and job-ready',
    weeklyHours: input.weeklyHours ?? 8,
    targetModuleCount: input.moduleCount,
    courseDepth: input.courseDepth,
    courseDepthInstruction: 'Write full-length detailed modules with original instructional content, examples, tasks, quizzes, and recaps.',
  };
}

function composeCourseFromAgentBundle(bundle: AgentCourseBundle) {
  const curriculum = asRecord(bundle.curriculum);
  const portfolio = asRecord(bundle.portfolio);

  return {
    title: curriculum?.title,
    overview: curriculum?.overview,
    courseSummary: curriculum?.courseSummary,
    estimatedDuration: curriculum?.estimatedDuration,
    skillLevel: curriculum?.skillLevel,
    skillOutcomes: curriculum?.skillOutcomes,
    phases: curriculum?.phases,
    projects: portfolio?.projects,
    resources: portfolio?.resources,
    interviewPrep: portfolio?.interviewPrep,
    certifications: portfolio?.certifications,
    recommendedTools: portfolio?.recommendedTools,
    milestones: portfolio?.milestones,
  };
}

function normalizeGeneratedCourse(
  candidate: unknown,
  input: GenerateInput,
  resources: ResearchResource[],
) {
  const fallback = buildFallbackCourse(input, resources);
  const record = asRecord(candidate);

  if (!record) {
    return fallback;
  }

  const resourceState = createPhaseResourceState();
  const phases = recordArray(record.phases)
    .map((phase, index) => normalizePhase(phase, index, input.topic, resources, resourceState))
    .filter(Boolean)
    .slice(0, input.moduleCount);

  if (phases.length < 4) {
    return fallback;
  }

  return {
    title: readString(record.title, fallback.title),
    overview: readString(record.overview, fallback.overview),
    courseSummary: readString(record.courseSummary, fallback.courseSummary),
    estimatedDuration: readString(record.estimatedDuration, fallback.estimatedDuration),
    skillLevel: readString(record.skillLevel, fallback.skillLevel),
    skillOutcomes: stringArray(record.skillOutcomes, fallback.skillOutcomes).slice(0, 12),
    phases,
    projects: recordArray(record.projects).length ? record.projects : fallback.projects,
    resources,
    interviewPrep: recordArray(record.interviewPrep).length ? record.interviewPrep : fallback.interviewPrep,
    certifications: recordArray(record.certifications).length ? record.certifications : fallback.certifications,
    recommendedTools: stringArray(record.recommendedTools, fallback.recommendedTools).slice(0, 16),
    milestones: recordArray(record.milestones).length ? record.milestones : fallback.milestones,
    generationMetadata: {
      strategy: 'multi-agent',
      agentPasses: ['curriculum', 'portfolio'],
      moduleCount: phases.length,
      courseDepth: input.courseDepth,
    },
  };
}

function normalizePhase(
  phase: Record<string, unknown>,
  index: number,
  topic: string,
  resources: ResearchResource[],
  resourceState: PhaseResourceState,
) {
  const phaseFallbackResources = selectFallbackPhaseResources(resources, resourceState, false);
  const fallback = buildFallbackPhase(
    `Module ${index + 1}: ${topic} Mastery`,
    `A detailed module for building practical ${topic} capability.`,
    index < 1 ? 'beginner' : index < 4 ? 'intermediate' : 'advanced',
    phaseFallbackResources.officialDocs,
    phaseFallbackResources.youtubeVideos,
    phaseFallbackResources.githubRepos,
    phaseFallbackResources.tutorials,
  );
  const officialDocs = recordArray(phase.officialDocs).length ? phase.officialDocs : fallback.officialDocs;
  const youtubeVideos = recordArray(phase.youtubeVideos).length ? phase.youtubeVideos : fallback.youtubeVideos;
  const githubRepos = recordArray(phase.githubRepos).length ? phase.githubRepos : fallback.githubRepos;
  const tutorials = recordArray(phase.tutorials).length ? phase.tutorials : fallback.tutorials;

  return {
    title: readString(phase.title, fallback.title),
    description: readString(phase.description, fallback.description),
    estimatedDuration: readString(phase.estimatedDuration, fallback.estimatedDuration),
    prerequisites: stringArray(phase.prerequisites, fallback.prerequisites).slice(0, 12),
    learningObjectives: stringArray(phase.learningObjectives, fallback.learningObjectives).slice(0, 12),
    tutorials: ensureTutorials(tutorials, resources, resourceState, 6),
    youtubeVideos: ensureYouTubeVideos(youtubeVideos, resources, resourceState, 4),
    officialDocs: ensureOfficialDocs(officialDocs, resources, resourceState, 4),
    githubRepos: ensureGithubRepos(githubRepos, resources, resourceState, 4),
    exercises: stringArray(phase.exercises, fallback.exercises).slice(0, 16),
    miniProjects: stringArray(phase.miniProjects, fallback.miniProjects).slice(0, 8),
    quizzes: recordArray(phase.quizzes).length ? phase.quizzes : fallback.quizzes,
    lessonNotes: stringArray(phase.lessonNotes, fallback.lessonNotes).slice(0, 16),
    recap: readString(phase.recap, fallback.recap),
    difficultyLevel: readString(phase.difficultyLevel, fallback.difficultyLevel),
  };
}

function ensureYouTubeVideos(
  videos: unknown,
  resources: ResearchResource[],
  state: PhaseResourceState,
  limit: number,
) {
  const existing = uniqueExistingRecords(recordArray(videos), state, limit);
  const injected = takeUnusedResources(resources, ['youtube'], state, limit - existing.length)
    .map((resource) => ({
      title: resource.title,
      channelName: resource.channelName,
      duration: resource.duration,
      url: resource.url,
      whyRecommended: resource.summary ?? resource.freshnessRelevance,
    }));

  return [...existing, ...injected].slice(0, limit);
}

function ensureOfficialDocs(
  docs: unknown,
  resources: ResearchResource[],
  state: PhaseResourceState,
  limit: number,
) {
  const existing = uniqueExistingRecords(recordArray(docs), state, limit);
  const injected = takeUnusedResources(resources, ['officialDocs'], state, limit - existing.length)
    .map((resource) => ({
      title: resource.title,
      source: resource.source,
      url: resource.url,
      summary: resource.summary ?? resource.freshnessRelevance,
    }));

  return [...existing, ...injected].slice(0, limit);
}

function ensureGithubRepos(
  repos: unknown,
  resources: ResearchResource[],
  state: PhaseResourceState,
  limit: number,
) {
  const existing = uniqueExistingRecords(recordArray(repos), state, limit);
  const injected = takeUnusedResources(resources, ['github'], state, limit - existing.length)
    .map((resource) => ({
      repositoryName: resource.title,
      url: resource.url,
      stars: resource.stars,
      whyUseful: resource.summary ?? 'Repository selected from live research.',
      projectRelevance: resource.freshnessRelevance,
    }));

  return [...existing, ...injected].slice(0, limit);
}

function ensureTutorials(
  tutorials: unknown,
  resources: ResearchResource[],
  state: PhaseResourceState,
  limit: number,
) {
  const existing = uniqueExistingRecords(recordArray(tutorials), state, limit);
  const injected = takeUnusedResources(resources, ['article', 'course', 'community'], state, limit - existing.length)
    .map((resource) => ({
      title: resource.title,
      source: resource.source,
      url: resource.url,
      summary: resource.summary ?? resource.freshnessRelevance,
      freshnessRelevance: resource.freshnessRelevance,
    }));

  return [...existing, ...injected].slice(0, limit);
}

function createPhaseResourceState(): PhaseResourceState {
  return {
    usedKeys: new Set<string>(),
    cursors: {
      officialDocs: 0,
      youtube: 0,
      github: 0,
      article: 0,
      course: 0,
      community: 0,
    },
  };
}

function selectFallbackPhaseResources(
  resources: ResearchResource[],
  state: PhaseResourceState,
  commitSelection = true,
) {
  const selectionState = commitSelection ? state : clonePhaseResourceState(state);

  return {
    officialDocs: takeUnusedResources(resources, ['officialDocs'], selectionState, 4),
    youtubeVideos: takeUnusedResources(resources, ['youtube'], selectionState, 4),
    githubRepos: takeUnusedResources(resources, ['github'], selectionState, 4),
    tutorials: takeUnusedResources(resources, ['article', 'course', 'community'], selectionState, 6),
  };
}

function clonePhaseResourceState(state: PhaseResourceState): PhaseResourceState {
  return {
    usedKeys: new Set(state.usedKeys),
    cursors: { ...state.cursors },
  };
}

function takeUnusedResources(
  resources: ResearchResource[],
  kinds: ResourceKind[],
  state: PhaseResourceState,
  limit: number,
) {
  if (limit <= 0) {
    return [];
  }

  const selected: ResearchResource[] = [];

  for (const kind of kinds) {
    const matchingResources = resources.filter((resource) => resource.kind === kind);
    let cursor = state.cursors[kind];

    while (cursor < matchingResources.length && selected.length < limit) {
      const resource = matchingResources[cursor];
      const key = resourceKey(resource.url, resource.title);
      cursor += 1;

      if (!key || state.usedKeys.has(key)) {
        continue;
      }

      state.usedKeys.add(key);
      selected.push(resource);
    }

    state.cursors[kind] = cursor;

    if (selected.length >= limit) {
      break;
    }
  }

  return selected;
}

function uniqueExistingRecords(
  records: Record<string, unknown>[],
  state: PhaseResourceState,
  limit: number,
) {
  const selected: Record<string, unknown>[] = [];

  for (const record of records) {
    if (selected.length >= limit) {
      break;
    }

    const title = readString(record.title, readString(record.repositoryName, ''));
    const key = resourceKey(readString(record.url, ''), title);

    if (!key || state.usedKeys.has(key)) {
      continue;
    }

    state.usedKeys.add(key);
    selected.push(record);
  }

  return selected;
}

function resourceKey(url: string, title: string) {
  const normalizedUrl = normalizeResourceUrl(url);

  if (normalizedUrl) {
    return normalizedUrl;
  }

  return title.trim().toLowerCase().replace(/\s+/g, ' ');
}

function normalizeResourceUrl(url: string) {
  if (!url.trim()) {
    return '';
  }

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
    const videoId = host.endsWith('youtube.com') && parsed.pathname === '/watch'
      ? parsed.searchParams.get('v')
      : null;
    parsed.hash = '';

    if (videoId) {
      parsed.search = `?v=${videoId}`;
    } else {
      parsed.search = '';
    }

    return parsed.toString().replace(/\/$/, '').toLowerCase();
  } catch {
    return url.trim().toLowerCase();
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function recordArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => Boolean(asRecord(item)))
    : [];
}

function stringArray(value: unknown, fallback: string[]) {
  const items = Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];

  return items.length ? items : fallback;
}

function readString(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
}

function extractJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);

    if (!match) {
      return null;
    }

    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function buildFallbackCourse(input: GenerateInput, resources: ResearchResource[]) {
  const topic = input.topic;
  const resourceState = createPhaseResourceState();
  const moduleTemplates = [
    ['Foundations And Mental Models', `Build the vocabulary, tooling, setup, and mental models needed to study ${topic} seriously.`, 'beginner'],
    ['Core Skills And Guided Implementation', `Turn the fundamentals into working ${topic} features through guided implementation and repetition.`, 'intermediate'],
    ['Applied Patterns And Real Projects', `Practice common professional patterns, debugging workflows, testing habits, and integration decisions for ${topic}.`, 'intermediate'],
    ['Production Workflow And Quality', `Move from demos to maintainable ${topic} work with performance, security, reliability, documentation, and review habits.`, 'intermediate'],
    ['Portfolio Capstone Studio', `Design, build, test, document, and present a substantial ${topic} capstone project.`, 'advanced'],
    ['Interview, System Design, And Career Readiness', `Convert the portfolio into interview stories, architecture explanations, tradeoff analysis, and job-ready evidence.`, 'advanced'],
  ] as const;

  return {
    title: `${topic} Full-Length Masterclass Roadmap`,
    overview: `A detailed ${input.moduleCount}-module ${topic} course generated from live web research, designed as a full-length learning program with deep notes, guided practice, portfolio projects, quizzes, milestones, and interview preparation.`,
    courseSummary: `Study ${topic} through a full course-player flow: learn the concepts, open vetted videos and links inside Roadlyn, complete structured exercises, ship portfolio work, and finish with interview-ready proof of skill.`,
    estimatedDuration: `${Math.max(16, Math.ceil((input.weeklyHours ?? 8) * 3))} weeks`,
    skillLevel: input.experienceLevel ?? 'beginner',
    skillOutcomes: [
      `Understand ${topic} fundamentals`,
      `Explain important ${topic} tradeoffs with concrete examples`,
      'Use official documentation and maintained repositories effectively',
      'Build multiple portfolio-ready projects',
      'Debug, test, document, and present production-style work',
      'Prepare for practical interviews and project walkthroughs',
    ],
    phases: moduleTemplates
      .slice(0, input.moduleCount)
      .map(([title, description, difficultyLevel]) => {
        const phaseResources = selectFallbackPhaseResources(resources, resourceState);

        return buildFallbackPhase(
          title,
          description,
          difficultyLevel,
          phaseResources.officialDocs,
          phaseResources.youtubeVideos,
          phaseResources.githubRepos,
          phaseResources.tutorials,
        );
      }),
    projects: [
      {
        title: `${topic} starter project`,
        level: 'beginner',
        description: 'Build a focused starter project that demonstrates the core workflow.',
        deliverables: ['Working implementation', 'README with setup steps', 'Feature walkthrough', 'Validation checklist', 'Short reflection on tradeoffs'],
        realWorldScenario: 'A junior developer proving they can turn documentation into a working feature.',
      },
      {
        title: `${topic} applied project`,
        level: 'intermediate',
        description: 'Create a more complete workflow using maintained libraries and current best practices from the research sources.',
        deliverables: ['Feature-complete app or workflow', 'Tests or validation checklist', 'Deployment or demo notes', 'Architecture notes', 'Known limitations'],
        realWorldScenario: 'A team needs a reliable internal tool or prototype built with modern practices.',
      },
      {
        title: `${topic} capstone`,
        level: 'advanced',
        description: 'Ship a polished capstone with documentation, architecture notes, and a portfolio case study.',
        deliverables: ['Production-style repository', 'Architecture write-up', 'Demo video outline', 'Interview talking points', 'Performance or quality review', 'Future roadmap'],
        realWorldScenario: 'A job-ready portfolio piece that shows end-to-end ownership.',
      },
    ],
    resources,
    interviewPrep: [
      {
        topic: `${topic} practical fluency`,
        concepts: ['Fundamentals', 'Tooling choices', 'Debugging', 'Architecture tradeoffs', 'Deployment readiness'],
        practicalQuestions: [
          `How would you design a small ${topic} project from scratch?`,
          'Which official docs or repositories would you trust first, and why?',
          'How would you evaluate whether an implementation is production-ready?',
          'How would you explain your capstone architecture to a senior engineer?',
          'What tradeoff did you make during implementation, and what would you change next?',
        ],
        portfolioSuggestion: 'Publish the capstone with a concise README, architecture notes, screenshots, and a short demo.',
      },
    ],
    certifications: [],
    recommendedTools: [...new Set(resources.map((resource) => resource.source))].slice(0, 8),
    milestones: [
      { week: 'Week 1-2', outcome: 'Fundamentals mapped', checkpoint: 'Explain the core concepts and install the required tools.' },
      { week: 'Week 3-6', outcome: 'Guided implementation complete', checkpoint: 'Finish exercises tied to current tutorials and docs.' },
      { week: 'Week 7-12', outcome: 'Applied projects shipped', checkpoint: 'Publish working projects with documentation and validation notes.' },
      { week: 'Week 13-18', outcome: 'Capstone built and reviewed', checkpoint: 'Complete architecture notes, tests, demo, and tradeoff review.' },
      { week: 'Final weeks', outcome: 'Interview-ready portfolio', checkpoint: 'Practice practical questions and polish the case study.' },
    ],
  };
}

function buildFallbackPhase(
  title: string,
  description: string,
  difficultyLevel: string,
  officialDocs: ResearchResource[],
  youtubeVideos: ResearchResource[],
  githubRepos: ResearchResource[],
  tutorials: ResearchResource[],
) {
  return {
    title,
    description,
    estimatedDuration: '3-6 weeks',
    prerequisites: title.includes('Foundations') ? ['Basic computer literacy', 'A development environment or learning workspace', 'Willingness to document practice work'] : ['Complete the previous module', 'Review earlier notes and blockers', 'Update your project journal'],
    learningObjectives: [
      'Study current resources and separate durable concepts from tool-specific details',
      'Practice the core workflow repeatedly until it feels predictable',
      'Create evidence of learning through commits, notes, examples, and demos',
      'Explain the module concepts in plain language and with technical vocabulary',
      'Identify common mistakes, debugging signals, and quality checks',
      'Connect this module to the final portfolio project',
    ],
    tutorials: tutorials.map((resource) => ({
      title: resource.title,
      source: resource.source,
      url: resource.url,
      summary: resource.summary ?? 'Live search result selected for current learning relevance.',
      freshnessRelevance: resource.freshnessRelevance,
    })),
    youtubeVideos: youtubeVideos.map((resource) => ({
      title: resource.title,
      channelName: resource.channelName,
      duration: resource.duration,
      url: resource.url,
      whyRecommended: 'Selected from live search results for tutorial or project-based learning relevance.',
    })),
    officialDocs: officialDocs.map((resource) => ({
      title: resource.title,
      source: resource.source,
      url: resource.url,
      summary: resource.summary ?? 'Official or documentation-style resource from live search.',
    })),
    githubRepos: githubRepos.map((resource) => ({
      repositoryName: resource.title,
      url: resource.url,
      stars: resource.stars,
      whyUseful: 'Repository or example project found during live search.',
      projectRelevance: 'Use it to inspect real implementation patterns and project structure.',
    })),
    exercises: [
      'Summarize the key concepts in your own words with one concrete example each',
      'Reproduce one tutorial from the selected resources without copy-pasting blindly',
      'Document blockers, fixes, commands, links, and decisions in a learning journal',
      'Create a small reference implementation that isolates one hard concept',
      'Write a checklist for reviewing your own work before moving forward',
      'Compare two approaches from the resources and explain when each is useful',
      'Add a README section that explains what you built and why',
      'Record a short demo script for the work completed in this module',
    ],
    miniProjects: [
      'Build a small working demo using the phase resources',
      'Extend the demo with one realistic edge case and document the tradeoff',
      'Refactor the demo for clarity and add validation steps',
    ],
    quizzes: [
      {
        question: 'Which resources should you trust first when details conflict?',
        answer: 'Official documentation and actively maintained repositories, then current high-quality tutorials.',
      },
      {
        question: 'How do you know you are ready to move to the next module?',
        answer: 'You can explain the main ideas, complete the exercises without step-by-step help, and show a working artifact.',
      },
      {
        question: 'What should you write down while learning?',
        answer: 'Commands, definitions, errors, fixes, decisions, tradeoffs, and examples you can reuse later.',
      },
      {
        question: 'Why do mini-projects matter more than passive reading?',
        answer: 'They turn concepts into evidence and reveal practical gaps that reading alone hides.',
      },
    ],
    lessonNotes: [
      `Read one trusted source, watch one guided lesson, then explain the ${title.toLowerCase()} concept in your own words.`,
      'Keep a running notebook with commands, definitions, decisions, and problems you solved.',
      'Start each study session by choosing one output you can finish, such as a note, demo, test, diagram, or README section.',
      'When a resource shows an example, pause and rebuild it from memory before checking your answer.',
      'Treat every blocker as course material: name the symptom, search the official source, test one fix, and document the result.',
      'After every major concept, connect it to a real product scenario so the knowledge has somewhere to live.',
      'End the module by revising your project and removing anything you no longer understand.',
      'Prepare one interview-style explanation that describes what you built, why it matters, and what tradeoff you accepted.',
    ],
    recap: `By the end of ${title.toLowerCase()}, you should be able to explain the key ideas, use the linked resources without hand-holding, and produce a small proof of work.`,
    difficultyLevel,
  };
}

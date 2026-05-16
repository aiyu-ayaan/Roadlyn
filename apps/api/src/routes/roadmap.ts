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

interface AgentCourseBundle {
  outline: unknown;
  curriculum: unknown;
  portfolio: unknown;
  compiled?: unknown;
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
      ? normalizeGeneratedCourse(agentBundle.compiled ?? composeCourseFromAgentBundle(agentBundle), input.input, researchedResources)
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
  const outline = await generateAgentWithRetries({
    ...input,
    operation: 'roadmap.agent.planner',
    prompt: buildPlannerPrompt(input.input, input.researchedResources),
  });
  const outlineJson = extractJson(outline.text);

  const [curriculum, portfolio] = await Promise.all([
    generateAgentWithRetries({
      ...input,
      operation: 'roadmap.agent.curriculum',
      prompt: buildCurriculumAgentPrompt(input.input, input.researchedResources, outlineJson),
    }),
    generateAgentWithRetries({
      ...input,
      operation: 'roadmap.agent.portfolio',
      prompt: buildPortfolioAgentPrompt(input.input, input.researchedResources, outlineJson),
    }),
  ]);
  const curriculumJson = extractJson(curriculum.text);
  const portfolioJson = extractJson(portfolio.text);
  const compiled = await generateAgentWithRetries({
    ...input,
    operation: 'roadmap.agent.compiler',
    prompt: buildCompilerPrompt(input.input, input.researchedResources, {
      outline: outlineJson,
      curriculum: curriculumJson,
      portfolio: portfolioJson,
    }),
  });

  return {
    outline: outlineJson,
    curriculum: curriculumJson,
    portfolio: portfolioJson,
    compiled: extractJson(compiled.text),
    result: compiled,
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

function buildPlannerPrompt(input: GenerateInput, researchedResources: ResearchResource[]) {
  return JSON.stringify({
    agent: 'Course architecture planner',
    task: 'Design the complete course blueprint before writing lessons.',
    generatedAt: new Date().toISOString(),
    input: buildPromptInput(input),
    liveResearchResources: researchedResources,
    requiredOutputShape: {
      title: '',
      overview: '',
      courseSummary: '',
      estimatedDuration: '',
      skillLevel: '',
      skillOutcomes: [''],
      moduleBlueprints: [
        {
          title: '',
          difficultyLevel: 'beginner',
          estimatedDuration: '',
          purpose: '',
          coreTopics: [''],
          practicalOutcomes: [''],
          assessment: '',
        },
      ],
    },
    qualityRules: [
      'Return exactly 4 to 6 modules. Never return fewer than 4 modules.',
      'Each module must be broad enough for a full online course section, not a tiny lesson.',
      'The whole course should feel like a full-length professional course, usually 16-32 weeks depending on weekly hours.',
      'Use a progression from foundations to real production work and a capstone.',
      'Return strict JSON only.',
    ],
  });
}

function buildCurriculumAgentPrompt(
  input: GenerateInput,
  researchedResources: ResearchResource[],
  outline: unknown,
) {
  return JSON.stringify({
    agent: 'Deep curriculum writer',
    task: 'Write the full-length module content for a course player.',
    input: buildPromptInput(input),
    courseOutline: outline,
    liveResearchResources: researchedResources,
    requiredOutputShape: {
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
      'Prefer YouTube URLs that can be embedded, official docs, and GitHub repos with practical code.',
      'Return strict JSON only.',
    ],
    enabledGenerationTasks: input.generationOptions,
  });
}

function buildPortfolioAgentPrompt(
  input: GenerateInput,
  researchedResources: ResearchResource[],
  outline: unknown,
) {
  return JSON.stringify({
    agent: 'Portfolio, assessment, and interview coach',
    task: 'Create the projects, milestones, certifications, interview prep, and recommended tools for the course.',
    input: buildPromptInput(input),
    courseOutline: outline,
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

function buildCompilerPrompt(
  input: GenerateInput,
  researchedResources: ResearchResource[],
  agentOutputs: {
    outline: unknown;
    curriculum: unknown;
    portfolio: unknown;
  },
) {
  return JSON.stringify({
    agent: 'Final course compiler and quality reviewer',
    task: 'Merge the planner, curriculum writer, and portfolio coach outputs into one complete GeneratedCourse JSON object.',
    generatedAt: new Date().toISOString(),
    input: buildPromptInput(input),
    liveResearchResources: researchedResources,
    agentOutputs,
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
      'The roadmap must feel like a Udemy course, roadmap.sh progression, Coursera curriculum, and personalized mentor.',
      'Make each phase playable as an online course module with concise notes, practice tasks, resources, and a recap.',
      'Create original course content between external resources: summaries, analogies, checklists, recaps, and next actions.',
      'Return exactly 4 to 6 phases/modules. If an agent returned more, consolidate them. If fewer, expand them to at least 4.',
      'Every phase must feel full-length: detailed description, 8-12 lesson notes, 6-10 objectives, 8-12 exercises, 3-5 mini projects, and 8-10 quizzes.',
      'Do not create small one-screen modules. Each module should represent multiple hours or weeks of learning.',
      'Start from fundamentals and progressively increase difficulty.',
      'Balance theory, practical exercises, projects, revision checkpoints, and interview prep.',
      'Include beginner projects, intermediate projects, and an advanced capstone project.',
      'Rank resources by quality and freshness before placing them into modules.',
      'Remove duplicates and low-quality resources.',
      'Use newest tools and best practices visible in the live research payload.',
      'Return clean structured JSON only.',
    ],
    enabledGenerationTasks: input.generationOptions,
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
  if (bundle.compiled) {
    return bundle.compiled;
  }

  const outline = asRecord(bundle.outline);
  const curriculum = asRecord(bundle.curriculum);
  const portfolio = asRecord(bundle.portfolio);

  return {
    title: outline?.title,
    overview: outline?.overview,
    courseSummary: outline?.courseSummary,
    estimatedDuration: outline?.estimatedDuration,
    skillLevel: outline?.skillLevel,
    skillOutcomes: outline?.skillOutcomes,
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

  const phases = recordArray(record.phases)
    .map((phase, index) => normalizePhase(phase, index, input.topic, resources))
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
      agentPasses: ['planner', 'curriculum', 'portfolio', 'compiler'],
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
) {
  const fallback = buildFallbackPhase(
    `Module ${index + 1}: ${topic} Mastery`,
    `A detailed module for building practical ${topic} capability.`,
    index < 1 ? 'beginner' : index < 4 ? 'intermediate' : 'advanced',
    resources.filter((resource) => resource.kind === 'officialDocs').slice(0, 4),
    resources.filter((resource) => resource.kind === 'youtube').slice(0, 4),
    resources.filter((resource) => resource.kind === 'github').slice(0, 4),
    resources.filter((resource) => ['article', 'course', 'community'].includes(resource.kind)).slice(0, 6),
  );

  return {
    title: readString(phase.title, fallback.title),
    description: readString(phase.description, fallback.description),
    estimatedDuration: readString(phase.estimatedDuration, fallback.estimatedDuration),
    prerequisites: stringArray(phase.prerequisites, fallback.prerequisites).slice(0, 12),
    learningObjectives: stringArray(phase.learningObjectives, fallback.learningObjectives).slice(0, 12),
    tutorials: recordArray(phase.tutorials).length ? phase.tutorials : fallback.tutorials,
    youtubeVideos: recordArray(phase.youtubeVideos).length ? phase.youtubeVideos : fallback.youtubeVideos,
    officialDocs: recordArray(phase.officialDocs).length ? phase.officialDocs : fallback.officialDocs,
    githubRepos: recordArray(phase.githubRepos).length ? phase.githubRepos : fallback.githubRepos,
    exercises: stringArray(phase.exercises, fallback.exercises).slice(0, 16),
    miniProjects: stringArray(phase.miniProjects, fallback.miniProjects).slice(0, 8),
    quizzes: recordArray(phase.quizzes).length ? phase.quizzes : fallback.quizzes,
    lessonNotes: stringArray(phase.lessonNotes, fallback.lessonNotes).slice(0, 16),
    recap: readString(phase.recap, fallback.recap),
    difficultyLevel: readString(phase.difficultyLevel, fallback.difficultyLevel),
  };
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
  const officialDocs = resources.filter((resource) => resource.kind === 'officialDocs').slice(0, 4);
  const youtubeVideos = resources.filter((resource) => resource.kind === 'youtube').slice(0, 4);
  const githubRepos = resources.filter((resource) => resource.kind === 'github').slice(0, 4);
  const tutorials = resources.filter((resource) => ['article', 'course', 'community'].includes(resource.kind)).slice(0, 6);
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
      .map(([title, description, difficultyLevel]) =>
        buildFallbackPhase(title, description, difficultyLevel, officialDocs, youtubeVideos, githubRepos, tutorials),
      ),
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

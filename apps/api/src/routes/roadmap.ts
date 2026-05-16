import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireScope } from '../middleware/auth';
import { AIGatewayService } from '../services/ai-gateway-service';
import { ResearchResource, researchLearningResources } from '../services/web-research-service';

const generateSchema = z.object({
  topic: z.string().min(1),
  experienceLevel: z.string().optional(),
  goal: z.string().optional(),
  weeklyHours: z.number().int().positive().max(80).optional(),
  providerId: z.string().optional(),
  modelId: z.string().optional(),
  useUserDefaults: z.boolean().default(false),
});

type GenerateInput = z.infer<typeof generateSchema>;

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

    const roadmaps = await fastify.db.roadmap.findMany({
      where: { userId: request.auth.userId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return { success: true, data: roadmaps };
  });

  fastify.post('/roadmaps/generate', {
    preHandler: requireScope('ai:write'),
    schema: {
      tags: ['Roadmaps'],
      summary: 'Generate a roadmap from live web research through the dynamic AI gateway',
      security: [{ bearerAuth: [] }],
    },
  }, async (request) => {
    const input = generateSchema.parse(request.body);
    const researchedResources = await researchLearningResources({
      topic: input.topic,
      experienceLevel: input.experienceLevel,
      goal: input.goal,
    });

    const result = await gateway.generateText({
      userId: request.auth?.userId,
      providerId: input.providerId,
      modelId: input.modelId,
      useUserDefaults: input.useUserDefaults,
      operation: 'roadmap.generate',
      system: buildCourseSystemPrompt(),
      prompt: buildCoursePrompt(input, researchedResources),
    });
    const roadmap = extractJson(result.text) ?? buildFallbackCourse(input, researchedResources);

    if (request.auth?.userId) {
      await fastify.db.roadmap.create({
        data: {
          userId: request.auth.userId,
          title: roadmap.title,
        },
      });
    }

    return {
      success: true,
      data: {
        ...result,
        roadmap,
        researchedResources,
      },
    };
  });
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

function buildCoursePrompt(input: GenerateInput, researchedResources: ResearchResource[]) {
  return JSON.stringify({
    task: 'Create a complete modern learning roadmap/course from live web research.',
    generatedAt: new Date().toISOString(),
    input: {
      topic: input.topic,
      experienceLevel: input.experienceLevel ?? 'beginner',
      goal: input.goal ?? 'Become practical and job-ready',
      weeklyHours: input.weeklyHours ?? 8,
    },
    liveResearchResources: researchedResources,
    requiredOutputShape: {
      title: '',
      overview: '',
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
      'Start from fundamentals and progressively increase difficulty.',
      'Balance theory, practical exercises, projects, revision checkpoints, and interview prep.',
      'Include beginner projects, intermediate projects, and an advanced capstone project.',
      'Rank resources by quality and freshness before placing them into modules.',
      'Remove duplicates and low-quality resources.',
      'Use newest tools and best practices visible in the live research payload.',
      'Return clean structured JSON only.',
    ],
  });
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

  return {
    title: `${topic} Live-Researched Learning Roadmap`,
    overview: `A practical roadmap for ${topic} generated from live web research, with current resources grouped into foundations, applied practice, portfolio projects, and interview preparation.`,
    estimatedDuration: `${Math.max(8, Math.ceil((input.weeklyHours ?? 8) * 2))} weeks`,
    skillLevel: input.experienceLevel ?? 'beginner',
    skillOutcomes: [
      `Understand ${topic} fundamentals`,
      'Use official documentation and maintained repositories effectively',
      'Build portfolio-ready projects',
      'Prepare for practical interviews',
    ],
    phases: [
      buildFallbackPhase('Foundations', 'Build the core vocabulary, tools, and conceptual base.', 'beginner', officialDocs, youtubeVideos, githubRepos, tutorials),
      buildFallbackPhase('Guided Practice', 'Follow current tutorials and implement small exercises from reputable sources.', 'intermediate', officialDocs, youtubeVideos, githubRepos, tutorials),
      buildFallbackPhase('Real-World Projects', 'Turn the concepts into deployable, portfolio-ready work.', 'intermediate', officialDocs, youtubeVideos, githubRepos, tutorials),
      buildFallbackPhase('Interview And Portfolio', 'Package projects, revise core concepts, and practice scenario questions.', 'advanced', officialDocs, youtubeVideos, githubRepos, tutorials),
    ],
    projects: [
      {
        title: `${topic} starter project`,
        level: 'beginner',
        description: 'Build a focused starter project that demonstrates the core workflow.',
        deliverables: ['Working implementation', 'README with setup steps', 'Short reflection on tradeoffs'],
        realWorldScenario: 'A junior developer proving they can turn documentation into a working feature.',
      },
      {
        title: `${topic} applied project`,
        level: 'intermediate',
        description: 'Create a more complete workflow using maintained libraries and current best practices from the research sources.',
        deliverables: ['Feature-complete app or workflow', 'Tests or validation checklist', 'Deployment or demo notes'],
        realWorldScenario: 'A team needs a reliable internal tool or prototype built with modern practices.',
      },
      {
        title: `${topic} capstone`,
        level: 'advanced',
        description: 'Ship a polished capstone with documentation, architecture notes, and a portfolio case study.',
        deliverables: ['Production-style repository', 'Architecture write-up', 'Demo video outline', 'Interview talking points'],
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
        ],
        portfolioSuggestion: 'Publish the capstone with a concise README, architecture notes, screenshots, and a short demo.',
      },
    ],
    certifications: [],
    recommendedTools: [...new Set(resources.map((resource) => resource.source))].slice(0, 8),
    milestones: [
      { week: 'Week 1', outcome: 'Fundamentals mapped', checkpoint: 'Explain the core concepts and install the required tools.' },
      { week: 'Week 2-4', outcome: 'Guided practice complete', checkpoint: 'Finish exercises tied to current tutorials and docs.' },
      { week: 'Week 5-8', outcome: 'Portfolio project shipped', checkpoint: 'Publish a working project with documentation.' },
      { week: 'Final week', outcome: 'Interview-ready portfolio', checkpoint: 'Practice practical questions and polish the case study.' },
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
    estimatedDuration: '2-4 weeks',
    prerequisites: title === 'Foundations' ? ['Basic computer literacy'] : ['Complete the previous phase'],
    learningObjectives: ['Study current resources', 'Practice the core workflow', 'Create evidence of learning'],
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
    exercises: ['Summarize the key concepts in your own words', 'Reproduce one tutorial from the selected resources', 'Document blockers and fixes'],
    miniProjects: ['Build a small working demo using the phase resources'],
    quizzes: [
      {
        question: 'Which resources should you trust first when details conflict?',
        answer: 'Official documentation and actively maintained repositories, then current high-quality tutorials.',
      },
    ],
    difficultyLevel,
  };
}

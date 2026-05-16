export const queryKeys = {
  auth: ['auth'] as const,
  providers: ['ai', 'providers'] as const,
  models: (providerId?: string) => ['ai', 'models', providerId] as const,
  keys: ['ai', 'keys'] as const,
  roadmaps: ['roadmaps'] as const,
};

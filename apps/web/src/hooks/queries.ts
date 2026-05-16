export const queryKeys = {
  auth: ['auth'] as const,
  adminUsers: ['admin', 'users'] as const,
  providers: ['ai', 'providers'] as const,
  models: (providerId?: string) => ['ai', 'models', providerId] as const,
  keys: ['ai', 'keys'] as const,
  nextKeyName: (providerType?: string) => ['ai', 'keys', 'next-name', providerType] as const,
  availableModels: (providerType?: string, keyId?: string) =>
    ['ai', 'available-models', providerType, keyId] as const,
  tokenUsage: (page?: number, filters?: Record<string, string | undefined>) =>
    ['admin', 'token-usage', page, filters] as const,
  tokenUsageStats: ['admin', 'token-usage', 'stats'] as const,
  roadmaps: ['roadmaps'] as const,
};

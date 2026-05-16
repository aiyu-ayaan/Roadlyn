// Common application types
export interface LoadingState {
  isLoading: boolean;
  error: Error | null;
}

export interface PaginationState {
  page: number;
  limit: number;
  total: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: {
    message: string;
    code: string;
  };
}

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  avatar?: string | null;
  role?: 'USER' | 'ADMIN';
}

export interface AdminUser extends AuthUser {
  role: 'USER' | 'ADMIN';
  createdAt: string;
  updatedAt: string;
  _count: {
    roadmaps: number;
    sessions: number;
    providerKeys: number;
  };
}

export interface TokenResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in: string;
  scope: string;
}

export interface OAuthClientResponse {
  id: string;
  name: string;
  clientId: string;
  clientSecret: string;
  scopes: string[];
  userId?: string | null;
  createdAt: string;
}

export type AIProviderType =
  | 'OPENAI'
  | 'ANTHROPIC'
  | 'GEMINI'
  | 'DEEPSEEK'
  | 'GROK'
  | 'MISTRAL'
  | 'TOGETHERAI'
  | 'OPENROUTER'
  | 'OLLAMA'
  | 'CUSTOM_OPENAI_COMPATIBLE';

export interface AIProvider {
  id: string;
  name: string;
  slug: string;
  providerType: AIProviderType;
  baseUrl?: string | null;
  supportsStreaming: boolean;
  supportsVision: boolean;
  supportsEmbeddings: boolean;
  enabled: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  models?: AIModel[];
}

export interface AIModel {
  id: string;
  providerId: string;
  modelName: string;
  displayName: string;
  contextWindow?: number | null;
  inputPricing?: string | number | null;
  outputPricing?: string | number | null;
  supportsTools: boolean;
  supportsVision: boolean;
  supportsReasoning: boolean;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProviderAPIKey {
  id: string;
  providerId: string;
  keyName: string;
  isDefault: boolean;
  isActive: boolean;
  lastValidatedAt?: string | null;
  createdAt: string;
}

export interface UserAISettings {
  id: string;
  userId: string;
  defaultProviderId?: string | null;
  defaultModelId?: string | null;
  fallbackProviderId?: string | null;
}

export interface RoadmapGenerateRequest {
  topic: string;
  experienceLevel?: string;
  goal?: string;
  weeklyHours?: number;
  providerId?: string;
  modelId?: string;
  useUserDefaults?: boolean;
}

export interface RoadmapGenerateResult {
  text: string;
  providerId: string;
  modelId: string;
  usage?: unknown;
}

export interface RealtimeEvent {
  type:
    | 'roadmap.progress'
    | 'roadmap.generated'
    | 'scraping.progress'
    | 'ai.stream'
    | 'notification';
  payload: Record<string, unknown>;
  createdAt?: string;
}

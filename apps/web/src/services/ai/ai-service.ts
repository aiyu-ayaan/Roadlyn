import { apiClient } from '@/services/api';
import {
  AIModel,
  AIProvider,
  AIProviderType,
  ApiResponse,
  AvailableModel,
  ProviderAPIKey,
  UserAISettings,
} from '@/types';

export interface ProviderInput {
  name: string;
  slug: string;
  providerType: AIProviderType;
  baseUrl?: string;
  supportsStreaming?: boolean;
  supportsVision?: boolean;
  supportsEmbeddings?: boolean;
  enabled?: boolean;
  isDefault?: boolean;
}

export interface ModelInput {
  providerId: string;
  modelName: string;
  displayName: string;
  contextWindow?: number;
  inputPricing?: number;
  outputPricing?: number;
  supportsTools?: boolean;
  supportsVision?: boolean;
  supportsReasoning?: boolean;
  enabled?: boolean;
}

export interface ProviderKeyInput {
  providerType: AIProviderType;
  providerId?: string;
  apiKey: string;
  keyName?: string;
  isDefault?: boolean;
}

export interface IntegrationInput {
  name: string;
  slug: string;
  providerType: AIProviderType;
  keyId: string;
  baseUrl?: string;
  models: { modelName: string; displayName: string; contextWindow?: number }[];
}

export const aiService = {
  async listProviders() {
    const { data } = await apiClient.get<ApiResponse<AIProvider[]>>('/api/ai/providers');
    return data.data;
  },
  async createProvider(input: ProviderInput) {
    const { data } = await apiClient.post<ApiResponse<AIProvider>>(
      '/api/ai/providers',
      input,
    );
    return data.data;
  },
  async updateProvider(id: string, input: Partial<ProviderInput>) {
    const { data } = await apiClient.patch<ApiResponse<AIProvider>>(
      `/api/ai/providers/${id}`,
      input,
    );
    return data.data;
  },
  async deleteProvider(id: string) {
    const { data } = await apiClient.delete<ApiResponse<AIProvider>>(
      `/api/ai/providers/${id}`,
    );
    return data.data;
  },
  async listModels(providerId?: string) {
    const { data } = await apiClient.get<ApiResponse<AIModel[]>>('/api/ai/models', {
      params: { providerId },
    });
    return data.data;
  },
  async createModel(input: ModelInput) {
    const { data } = await apiClient.post<ApiResponse<AIModel>>('/api/ai/models', input);
    return data.data;
  },
  async addKey(input: ProviderKeyInput) {
    const { data } = await apiClient.post<ApiResponse<ProviderAPIKey>>(
      '/api/ai/keys',
      input,
    );
    return data.data;
  },
  async listKeys(params?: { providerId?: string; providerType?: string }) {
    const { data } = await apiClient.get<ApiResponse<ProviderAPIKey[]>>('/api/ai/keys', {
      params,
    });
    return data.data;
  },
  async deleteKey(id: string) {
    await apiClient.delete(`/api/ai/keys/${id}`);
  },
  async validateKey(input: { providerType: AIProviderType; apiKey: string; baseUrl?: string }) {
    const { data } = await apiClient.post<
      ApiResponse<{ valid: boolean; error?: string }>
    >('/api/ai/keys/validate', input);
    return data.data;
  },
  async getNextKeyName(providerType: AIProviderType) {
    const { data } = await apiClient.get<ApiResponse<{ name: string }>>(
      '/api/ai/keys/next-name',
      { params: { providerType } },
    );
    return data.data;
  },
  async listAvailableModels(input: { providerType: AIProviderType; keyId: string }) {
    const { data } = await apiClient.post<ApiResponse<AvailableModel[]>>(
      '/api/ai/available-models',
      input,
    );
    return data.data;
  },
  async createIntegration(input: IntegrationInput) {
    const { data } = await apiClient.post<ApiResponse<AIProvider>>(
      '/api/ai/integrations',
      input,
    );
    return data.data;
  },
  async setDefaultProvider(input: {
    userId: string;
    providerId: string;
    fallbackProviderId?: string;
  }) {
    const { data } = await apiClient.post<ApiResponse<UserAISettings>>(
      '/api/ai/default-provider',
      input,
    );
    return data.data;
  },
  async setDefaultModel(input: { userId: string; modelId: string }) {
    const { data } = await apiClient.post<ApiResponse<UserAISettings>>(
      '/api/ai/default-model',
      input,
    );
    return data.data;
  },
  async testProvider(input: { providerId: string; modelId: string }) {
    const { data } = await apiClient.post<
      ApiResponse<{ ok: boolean; status: number; providerId: string; modelId: string }>
    >('/api/ai/test-provider', input);
    return data.data;
  },
  async setPlatformDefaultProvider(providerId: string) {
    const { data } = await apiClient.post<ApiResponse<AIProvider>>(
      '/api/admin/ai/default-provider',
      { providerId },
    );
    return data.data;
  },
};

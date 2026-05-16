import { apiClient } from '@/services/api';
import {
  ApiResponse,
  PaginatedResponse,
  TokenUsageRecord,
  TokenUsageStats,
} from '@/types';

export interface TokenUsageFilters {
  providerId?: string;
  modelId?: string;
  userId?: string;
  operation?: string;
  success?: string;
  from?: string;
  to?: string;
}

export const tokenUsageService = {
  async list(page = 1, limit = 25, filters?: TokenUsageFilters) {
    const { data } = await apiClient.get<PaginatedResponse<TokenUsageRecord>>(
      '/api/admin/token-usage',
      {
        params: { page, limit, ...filters },
      },
    );
    return data;
  },

  async getStats() {
    const { data } = await apiClient.get<ApiResponse<TokenUsageStats>>(
      '/api/admin/token-usage/stats',
    );
    return data.data;
  },
};

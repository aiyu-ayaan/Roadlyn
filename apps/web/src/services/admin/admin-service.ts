import { apiClient } from '@/services/api';
import { AdminUser, ApiResponse } from '@/types';

export const adminService = {
  async listUsers() {
    const { data } = await apiClient.get<ApiResponse<AdminUser[]>>('/api/admin/users');
    return data.data;
  },
  async updateUserGenerationPolicy(
    id: string,
    input: {
      maxGenerations?: number | null;
      generationCooldownSeconds?: number;
      unlimitedGenerations?: boolean;
      noGenerationCooldown?: boolean;
    }
  ) {
    const { data } = await apiClient.patch<ApiResponse<AdminUser>>(
      `/api/admin/users/${id}/generation-policy`,
      input
    );

    return data.data;
  },
};

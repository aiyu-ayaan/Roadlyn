import { apiClient } from '@/services/api';
import { AdminUser, ApiResponse } from '@/types';

export const adminService = {
  async listUsers() {
    const { data } = await apiClient.get<ApiResponse<AdminUser[]>>('/api/admin/users');
    return data.data;
  },
};

import { apiClient } from '@/services/api';
import { ApiResponse, RoadmapDetail, RoadmapGenerateRequest, RoadmapGenerateResult, RoadmapStatus } from '@/types';

export interface RoadmapSummary {
  id: string;
  title: string;
  topic?: string | null;
  status: RoadmapStatus;
  progress: number;
  errorMessage?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export const roadmapService = {
  async listRoadmaps() {
    const { data } = await apiClient.get<ApiResponse<RoadmapSummary[]>>('/api/roadmaps');
    return data.data;
  },
  async getRoadmap(id: string) {
    const { data } = await apiClient.get<ApiResponse<RoadmapDetail>>(`/api/roadmaps/${id}`);
    return data.data;
  },
  async generate(input: RoadmapGenerateRequest) {
    const { data } = await apiClient.post<ApiResponse<RoadmapGenerateResult>>(
      '/api/roadmaps/generate',
      input,
    );
    return data.data;
  },
  async deleteRoadmap(id: string) {
    const { data } = await apiClient.delete<ApiResponse<{ id: string }>>(`/api/roadmaps/${id}`);
    return data.data;
  },
};

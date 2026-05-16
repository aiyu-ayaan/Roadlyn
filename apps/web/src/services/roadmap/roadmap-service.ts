import { apiClient } from '@/services/api';
import { ApiResponse, RoadmapGenerateRequest, RoadmapGenerateResult } from '@/types';

export interface RoadmapSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  progress?: number;
}

export const roadmapService = {
  async listRoadmaps() {
    const { data } = await apiClient.get<ApiResponse<RoadmapSummary[]>>('/api/roadmaps');
    return data.data;
  },
  async generate(input: RoadmapGenerateRequest) {
    const { data } = await apiClient.post<ApiResponse<RoadmapGenerateResult>>(
      '/api/roadmaps/generate',
      input,
    );
    return data.data;
  },
};

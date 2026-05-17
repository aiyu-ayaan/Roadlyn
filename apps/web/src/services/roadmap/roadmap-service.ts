import { apiClient } from '@/services/api';
import {
  ApiResponse,
  ResourcePreview,
  RoadmapDetail,
  RoadmapGenerateRequest,
  RoadmapGenerateResult,
  RoadmapSimilarityResult,
  RoadmapStatus,
} from '@/types';

export interface RoadmapSummary {
  id: string;
  title: string;
  topic?: string | null;
  status: RoadmapStatus;
  progress: number;
  visibility?: 'PRIVATE' | 'PUBLIC' | string;
  ownerName?: string | null;
  ownerEmail?: string | null;
  enrollmentCount?: number;
  isEnrolled?: boolean;
  source?: 'generated' | 'enrolled';
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
  async checkSimilar(input: Pick<RoadmapGenerateRequest, 'topic' | 'experienceLevel' | 'goal' | 'weeklyHours'>) {
    const { data } = await apiClient.post<ApiResponse<RoadmapSimilarityResult>>(
      '/api/roadmaps/check-similar',
      input
    );
    return data.data;
  },
  async generate(input: RoadmapGenerateRequest) {
    const { data } = await apiClient.post<ApiResponse<RoadmapGenerateResult>>(
      '/api/roadmaps/generate',
      input
    );
    return data.data;
  },
  async deleteRoadmap(id: string) {
    const { data } = await apiClient.delete<ApiResponse<{ id: string }>>(`/api/roadmaps/${id}`);
    return data.data;
  },
  async discoverPublicRoadmaps(query?: string) {
    const { data } = await apiClient.get<ApiResponse<RoadmapSummary[]>>(
      '/api/roadmaps/discover/public',
      {
        params: query ? { q: query } : undefined,
      }
    );
    return data.data;
  },
  async enrollRoadmap(id: string) {
    const { data } = await apiClient.post<
      ApiResponse<{ roadmapId: string; alreadyOwned?: boolean }>
    >(`/api/roadmaps/${id}/enroll`);
    return data.data;
  },
  async unenrollRoadmap(id: string) {
    const { data } = await apiClient.delete<ApiResponse<{ roadmapId: string }>>(
      `/api/roadmaps/${id}/enroll`
    );
    return data.data;
  },
  async previewResource(url: string) {
    const { data } = await apiClient.get<ApiResponse<ResourcePreview>>(
      '/api/roadmaps/resource-preview',
      {
        params: { url },
      }
    );
    return data.data;
  },
};

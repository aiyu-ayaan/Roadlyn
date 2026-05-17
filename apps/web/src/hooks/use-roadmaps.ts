import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/hooks/queries';
import { roadmapService } from '@/services/roadmap/roadmap-service';
import { RoadmapGenerateRequest } from '@/types';

export function useRoadmaps() {
  return useQuery({
    queryKey: queryKeys.roadmaps,
    queryFn: roadmapService.listRoadmaps,
  });
}

export function useRoadmap(id?: string) {
  return useQuery({
    queryKey: queryKeys.roadmap(id),
    queryFn: () => roadmapService.getRoadmap(id!),
    enabled: Boolean(id),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'QUEUED' || status === 'RUNNING' ? 3000 : false;
    },
  });
}

export function useCheckSimilarRoadmaps() {
  return useMutation({
    mutationFn: (input: Pick<RoadmapGenerateRequest, 'topic' | 'experienceLevel' | 'goal' | 'weeklyHours'>) =>
      roadmapService.checkSimilar(input),
  });
}

export function useGenerateRoadmap() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: RoadmapGenerateRequest) => roadmapService.generate(input),
    onSuccess: (result) => {
      if ('roadmapId' in result) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.roadmaps });
      }
    },
  });
}

export function useDeleteRoadmap() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => roadmapService.deleteRoadmap(id),
    onSuccess: (_result, id) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.roadmaps });
      void queryClient.removeQueries({ queryKey: queryKeys.roadmap(id) });
    },
  });
}

export function usePublicRoadmaps(query?: string) {
  return useQuery({
    queryKey: queryKeys.publicRoadmaps(query),
    queryFn: () => roadmapService.discoverPublicRoadmaps(query),
  });
}

export function useEnrollRoadmap() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => roadmapService.enrollRoadmap(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.roadmaps });
      void queryClient.invalidateQueries({ queryKey: ['roadmaps', 'public'] });
    },
  });
}

export function useUnenrollRoadmap() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => roadmapService.unenrollRoadmap(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.roadmaps });
      void queryClient.invalidateQueries({ queryKey: ['roadmaps', 'public'] });
    },
  });
}

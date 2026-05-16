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

export function useGenerateRoadmap() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: RoadmapGenerateRequest) => roadmapService.generate(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.roadmaps });
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

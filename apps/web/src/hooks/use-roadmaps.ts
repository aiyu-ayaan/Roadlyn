import { useMutation, useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/hooks/queries';
import { roadmapService } from '@/services/roadmap/roadmap-service';
import { RoadmapGenerateRequest } from '@/types';

export function useRoadmaps() {
  return useQuery({
    queryKey: queryKeys.roadmaps,
    queryFn: roadmapService.listRoadmaps,
  });
}

export function useGenerateRoadmap() {
  return useMutation({
    mutationFn: (input: RoadmapGenerateRequest) => roadmapService.generate(input),
  });
}

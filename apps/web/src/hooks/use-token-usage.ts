import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/hooks/queries';
import {
  tokenUsageService,
  TokenUsageFilters,
} from '@/services/admin/token-usage-service';

export function useTokenUsage(page = 1, limit = 25, filters?: TokenUsageFilters) {
  return useQuery({
    queryKey: queryKeys.tokenUsage(page, filters as Record<string, string | undefined>),
    queryFn: () => tokenUsageService.list(page, limit, filters),
  });
}

export function useTokenUsageStats() {
  return useQuery({
    queryKey: queryKeys.tokenUsageStats,
    queryFn: () => tokenUsageService.getStats(),
  });
}

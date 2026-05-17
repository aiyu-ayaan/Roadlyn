import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/hooks/queries';
import { adminService } from '@/services/admin/admin-service';

export function useAdminUsers() {
  return useQuery({
    queryKey: queryKeys.adminUsers,
    queryFn: adminService.listUsers,
  });
}

export function useUpdateUserGenerationPolicy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      id: string;
      maxGenerations?: number | null;
      generationCooldownSeconds?: number;
      unlimitedGenerations?: boolean;
      noGenerationCooldown?: boolean;
    }) =>
      adminService.updateUserGenerationPolicy(input.id, {
        maxGenerations: input.maxGenerations,
        generationCooldownSeconds: input.generationCooldownSeconds,
        unlimitedGenerations: input.unlimitedGenerations,
        noGenerationCooldown: input.noGenerationCooldown,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.adminUsers });
    },
  });
}

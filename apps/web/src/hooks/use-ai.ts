import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { aiService, ModelInput, ProviderInput, ProviderKeyInput } from '@/services/ai/ai-service';
import { queryKeys } from '@/hooks/queries';

export function useProviders() {
  return useQuery({
    queryKey: queryKeys.providers,
    queryFn: aiService.listProviders,
  });
}

export function useModels(providerId?: string) {
  return useQuery({
    queryKey: queryKeys.models(providerId),
    queryFn: () => aiService.listModels(providerId),
  });
}

export function useProviderKeys(providerId?: string) {
  return useQuery({
    queryKey: [...queryKeys.keys, providerId],
    queryFn: () => aiService.listKeys({ providerId }),
  });
}

export function useCreateProvider() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ProviderInput) => aiService.createProvider(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.providers }),
  });
}

export function useUpdateProvider() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<ProviderInput> }) =>
      aiService.updateProvider(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.providers }),
  });
}

export function useCreateModel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ModelInput) => aiService.createModel(input),
    onSuccess: (_model, input) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.providers });
      queryClient.invalidateQueries({ queryKey: queryKeys.models(input.providerId) });
    },
  });
}

export function useAddProviderKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ProviderKeyInput) => aiService.addKey(input),
    onSuccess: (_key, input) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.keys });
      queryClient.invalidateQueries({ queryKey: queryKeys.models(input.providerId) });
    },
  });
}

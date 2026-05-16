import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  aiService,
  IntegrationInput,
  ModelInput,
  ProviderInput,
  ProviderKeyInput,
} from '@/services/ai/ai-service';
import { queryKeys } from '@/hooks/queries';
import { AIProviderType } from '@/types';

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

export function useDeleteProviderKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => aiService.deleteKey(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.keys }),
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

export function useSetPlatformDefaultProvider() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (providerId: string) => aiService.setPlatformDefaultProvider(providerId),
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.keys });
    },
  });
}

export function useValidateKey() {
  return useMutation({
    mutationFn: (input: { providerType: AIProviderType; apiKey: string; baseUrl?: string }) =>
      aiService.validateKey(input),
  });
}

export function useNextKeyName(providerType?: AIProviderType) {
  return useQuery({
    queryKey: queryKeys.nextKeyName(providerType),
    queryFn: () => aiService.getNextKeyName(providerType!),
    enabled: !!providerType,
  });
}

export function useAvailableModels(providerType?: AIProviderType, keyId?: string) {
  return useQuery({
    queryKey: queryKeys.availableModels(providerType, keyId),
    queryFn: () => aiService.listAvailableModels({ providerType: providerType!, keyId: keyId! }),
    enabled: !!providerType && !!keyId,
  });
}

export function useCreateIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: IntegrationInput) => aiService.createIntegration(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.providers });
      queryClient.invalidateQueries({ queryKey: queryKeys.keys });
    },
  });
}

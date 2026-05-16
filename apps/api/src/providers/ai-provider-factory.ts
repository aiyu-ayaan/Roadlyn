import { AIProviderType } from '@prisma/client';

export interface ProviderRuntimeConfig {
  providerType: AIProviderType;
  apiKey?: string;
  baseUrl?: string | null;
  modelName: string;
}

export interface ProviderRuntime {
  model: unknown;
  chatCompletionsUrl?: string;
  headers: Record<string, string>;
}

const defaultBaseUrls: Partial<Record<AIProviderType, string>> = {
  OPENAI: 'https://api.openai.com/v1',
  DEEPSEEK: 'https://api.deepseek.com/v1',
  GROK: 'https://api.x.ai/v1',
  TOGETHERAI: 'https://api.together.xyz/v1',
  OPENROUTER: 'https://openrouter.ai/api/v1',
  OLLAMA: 'http://localhost:11434/v1',
};

function joinUrl(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}

export class AIProviderFactory {
  async create(config: ProviderRuntimeConfig): Promise<ProviderRuntime> {
    const apiKey = config.apiKey ?? 'ollama-local';

    switch (config.providerType) {
      case 'OPENAI':
        return this.createOpenAICompatible(config, apiKey);
      case 'DEEPSEEK':
      case 'GROK':
      case 'TOGETHERAI':
      case 'OPENROUTER':
      case 'OLLAMA':
      case 'CUSTOM_OPENAI_COMPATIBLE':
        return this.createOpenAICompatible(config, apiKey);
      case 'ANTHROPIC':
        return this.createAnthropic(config, apiKey);
      case 'GEMINI':
        return this.createGemini(config, apiKey);
      case 'MISTRAL':
        return this.createMistral(config, apiKey);
      default:
        throw new Error(`Unsupported provider type: ${config.providerType}`);
    }
  }

  private async createOpenAICompatible(
    config: ProviderRuntimeConfig,
    apiKey: string,
  ): Promise<ProviderRuntime> {
    const { createOpenAI } = await import('@ai-sdk/openai');
    const baseURL =
      config.baseUrl ?? defaultBaseUrls[config.providerType] ?? defaultBaseUrls.OPENAI ?? 'https://api.openai.com/v1';
    const provider = createOpenAI({
      apiKey,
      baseURL,
    });

    return {
      model: provider(config.modelName),
      chatCompletionsUrl: joinUrl(baseURL, '/chat/completions'),
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
    };
  }

  private async createAnthropic(
    config: ProviderRuntimeConfig,
    apiKey: string,
  ): Promise<ProviderRuntime> {
    const { createAnthropic } = await import('@ai-sdk/anthropic');
    const provider = createAnthropic({
      apiKey,
      baseURL: config.baseUrl ?? undefined,
    });

    return {
      model: provider(config.modelName),
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
    };
  }

  private async createGemini(
    config: ProviderRuntimeConfig,
    apiKey: string,
  ): Promise<ProviderRuntime> {
    const { createGoogleGenerativeAI } = await import('@ai-sdk/google');
    const provider = createGoogleGenerativeAI({
      apiKey,
      baseURL: config.baseUrl ?? undefined,
    });

    return {
      model: provider(config.modelName),
      headers: {
        'x-goog-api-key': apiKey,
        'content-type': 'application/json',
      },
    };
  }

  private async createMistral(
    config: ProviderRuntimeConfig,
    apiKey: string,
  ): Promise<ProviderRuntime> {
    const { createMistral } = await import('@ai-sdk/mistral');
    const provider = createMistral({
      apiKey,
      baseURL: config.baseUrl ?? undefined,
    });

    return {
      model: provider(config.modelName),
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
    };
  }
}

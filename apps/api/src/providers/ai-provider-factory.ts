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

export interface AvailableModel {
  id: string;
  name: string;
  contextWindow?: number | null;
}

const defaultBaseUrls: Partial<Record<AIProviderType, string>> = {
  OPENAI: 'https://api.openai.com/v1',
  DEEPSEEK: 'https://api.deepseek.com/v1',
  GROK: 'https://api.x.ai/v1',
  TOGETHERAI: 'https://api.together.xyz/v1',
  OPENROUTER: 'https://openrouter.ai/api/v1',
  OLLAMA: 'http://localhost:11434/v1',
};

const providerDisplayNames: Record<AIProviderType, string> = {
  OPENAI: 'OpenAI',
  ANTHROPIC: 'Anthropic',
  GEMINI: 'Google',
  DEEPSEEK: 'DeepSeek',
  GROK: 'Grok',
  MISTRAL: 'Mistral',
  TOGETHERAI: 'Together',
  OPENROUTER: 'OpenRouter',
  OLLAMA: 'Ollama',
  CUSTOM_OPENAI_COMPATIBLE: 'Custom',
};

function joinUrl(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}

export class AIProviderFactory {
  getDisplayName(providerType: AIProviderType): string {
    return providerDisplayNames[providerType] ?? providerType;
  }

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

  async validateKey(
    providerType: AIProviderType,
    apiKey: string,
    baseUrl?: string | null
  ): Promise<{ valid: boolean; error?: string }> {
    try {
      const { generateText } = await import('ai');

      // Pick a small/cheap model for validation
      const validationModel = this.getValidationModelName(providerType);
      const runtime = await this.create({
        providerType,
        apiKey,
        baseUrl,
        modelName: validationModel,
      });
      type GenerateTextOptions = Parameters<typeof generateText>[0];

      const result = await generateText({
        model: runtime.model as GenerateTextOptions['model'],
        prompt: 'Reply with only the word: pong',
        maxOutputTokens: 8,
      });

      return { valid: Boolean(result.text) };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown validation error';
      return { valid: false, error: message };
    }
  }

  async listAvailableModels(
    providerType: AIProviderType,
    apiKey: string,
    baseUrl?: string | null
  ): Promise<AvailableModel[]> {
    try {
      switch (providerType) {
        case 'OPENAI':
        case 'DEEPSEEK':
        case 'GROK':
        case 'TOGETHERAI':
        case 'OPENROUTER':
        case 'OLLAMA':
        case 'CUSTOM_OPENAI_COMPATIBLE':
          return this.listOpenAICompatibleModels(providerType, apiKey, baseUrl);
        case 'GEMINI':
          return this.listGeminiModels(apiKey);
        case 'MISTRAL':
          return this.listMistralModels(apiKey, baseUrl);
        case 'ANTHROPIC':
          return this.getAnthropicModels();
        default:
          return [];
      }
    } catch {
      return [];
    }
  }

  private getValidationModelName(providerType: AIProviderType): string {
    const modelMap: Record<AIProviderType, string> = {
      OPENAI: 'gpt-4o-mini',
      ANTHROPIC: 'claude-sonnet-4-20250514',
      GEMINI: 'gemini-2.0-flash',
      DEEPSEEK: 'deepseek-chat',
      GROK: 'grok-3-mini-fast',
      MISTRAL: 'mistral-small-latest',
      TOGETHERAI: 'meta-llama/Llama-3-8b-chat-hf',
      OPENROUTER: 'openai/gpt-4o-mini',
      OLLAMA: 'llama3',
      CUSTOM_OPENAI_COMPATIBLE: 'gpt-4o-mini',
    };
    return modelMap[providerType] ?? 'gpt-4o-mini';
  }

  private async listOpenAICompatibleModels(
    providerType: AIProviderType,
    apiKey: string,
    baseUrl?: string | null
  ): Promise<AvailableModel[]> {
    const base = baseUrl ?? defaultBaseUrls[providerType] ?? defaultBaseUrls.OPENAI!;
    const response = await fetch(joinUrl(base, '/models'), {
      headers: { authorization: `Bearer ${apiKey}` },
    });

    if (!response.ok) return [];

    const json = (await response.json()) as {
      data?: Array<{ id: string; context_length?: number }>;
    };
    const models = json.data ?? [];

    return models
      .map((m) => ({
        id: m.id,
        name: m.id,
        contextWindow: m.context_length ?? null,
      }))
      .sort((a, b) => a.id.localeCompare(b.id));
  }

  private async listGeminiModels(apiKey: string): Promise<AvailableModel[]> {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );

    if (!response.ok) return [];

    const json = (await response.json()) as {
      models?: Array<{
        name: string;
        displayName: string;
        inputTokenLimit?: number;
      }>;
    };

    return (json.models ?? [])
      .filter((m) => m.name.startsWith('models/gemini'))
      .map((m) => ({
        id: m.name.replace('models/', ''),
        name: m.displayName,
        contextWindow: m.inputTokenLimit ?? null,
      }))
      .sort((a, b) => a.id.localeCompare(b.id));
  }

  private async listMistralModels(
    apiKey: string,
    baseUrl?: string | null
  ): Promise<AvailableModel[]> {
    const base = baseUrl ?? 'https://api.mistral.ai/v1';
    const response = await fetch(joinUrl(base, '/models'), {
      headers: { authorization: `Bearer ${apiKey}` },
    });

    if (!response.ok) return [];

    const json = (await response.json()) as {
      data?: Array<{ id: string; max_context_length?: number }>;
    };

    return (json.data ?? [])
      .map((m) => ({
        id: m.id,
        name: m.id,
        contextWindow: m.max_context_length ?? null,
      }))
      .sort((a, b) => a.id.localeCompare(b.id));
  }

  private async getAnthropicModels(): Promise<AvailableModel[]> {
    // Anthropic doesn't have a public models list endpoint; return curated list
    return [
      {
        id: 'claude-sonnet-4-20250514',
        name: 'Claude Sonnet 4',
        contextWindow: 200000,
      },
      {
        id: 'claude-opus-4-20250514',
        name: 'Claude Opus 4',
        contextWindow: 200000,
      },
      {
        id: 'claude-3-5-haiku-20241022',
        name: 'Claude 3.5 Haiku',
        contextWindow: 200000,
      },
      {
        id: 'claude-3-5-sonnet-20241022',
        name: 'Claude 3.5 Sonnet',
        contextWindow: 200000,
      },
    ];
  }

  private async createOpenAICompatible(
    config: ProviderRuntimeConfig,
    apiKey: string
  ): Promise<ProviderRuntime> {
    const { createOpenAI } = await import('@ai-sdk/openai');
    const baseURL =
      config.baseUrl ??
      defaultBaseUrls[config.providerType] ??
      defaultBaseUrls.OPENAI ??
      'https://api.openai.com/v1';
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
    apiKey: string
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
    apiKey: string
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
    apiKey: string
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

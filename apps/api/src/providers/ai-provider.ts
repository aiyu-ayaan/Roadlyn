/**
 * AI Provider Architecture Placeholders
 * Structure for integrating different AI providers
 */

export interface AIProviderConfig {
  name: string;
  apiKey: string;
  baseUrl?: string;
}

export interface AIProviderFactory {
  create(config: AIProviderConfig): AIProvider;
}

export interface AIProvider {
  generateRoadmap(prompt: string): Promise<string>;
  analyzeRequirements(requirements: string): Promise<string>;
}

/**
 * TODO: Implement specific providers
 * - OpenAI provider
 * - Anthropic provider
 * - LangChain integration
 */

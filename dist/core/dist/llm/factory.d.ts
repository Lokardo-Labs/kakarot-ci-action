/**
 * LLM provider factory
 */
import type { KakarotConfig } from '../types/config.js';
import type { LLMProvider } from '../types/llm.js';
/**
 * Create an LLM provider based on configuration
 */
export declare function createLLMProvider(config: Pick<KakarotConfig, 'apiKey' | 'provider' | 'model' | 'maxTokens'>): LLMProvider;
//# sourceMappingURL=factory.d.ts.map
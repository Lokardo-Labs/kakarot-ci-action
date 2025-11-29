/**
 * Anthropic (Claude) provider implementation
 */
import { BaseLLMProvider } from './base.js';
import type { LLMMessage, LLMResponse, LLMGenerateOptions } from '../../types/llm.js';
export declare class AnthropicProvider extends BaseLLMProvider {
    private baseUrl;
    generate(messages: LLMMessage[], options?: LLMGenerateOptions): Promise<LLMResponse>;
}
//# sourceMappingURL=anthropic.d.ts.map
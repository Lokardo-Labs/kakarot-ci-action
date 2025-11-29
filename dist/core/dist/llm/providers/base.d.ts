/**
 * Base LLM provider interface and utilities
 */
import type { LLMMessage, LLMResponse, LLMGenerateOptions, LLMProvider } from '../../types/llm.js';
export declare abstract class BaseLLMProvider implements LLMProvider {
    protected apiKey: string;
    protected model: string;
    protected defaultOptions: Required<LLMGenerateOptions>;
    constructor(apiKey: string, model: string, defaultOptions?: Partial<LLMGenerateOptions>);
    abstract generate(messages: LLMMessage[], options?: LLMGenerateOptions): Promise<LLMResponse>;
    protected mergeOptions(options?: LLMGenerateOptions): Required<LLMGenerateOptions>;
    protected validateApiKey(): void;
    protected logUsage(usage: LLMResponse['usage'], operation: string): void;
}
//# sourceMappingURL=base.d.ts.map
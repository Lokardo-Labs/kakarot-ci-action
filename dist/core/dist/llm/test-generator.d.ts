/**
 * Main test generator that orchestrates LLM calls and parsing
 */
import type { KakarotConfig } from '../types/config.js';
import type { TestGenerationContext, TestGenerationResult, TestFixContext } from '../types/llm.js';
export declare class TestGenerator {
    private provider;
    private config;
    constructor(config: Pick<KakarotConfig, 'apiKey' | 'provider' | 'model' | 'maxTokens' | 'maxFixAttempts' | 'temperature' | 'fixTemperature'>);
    /**
     * Generate test code for a test target
     */
    generateTest(context: TestGenerationContext): Promise<TestGenerationResult>;
    /**
     * Fix a failing test by generating a corrected version
     */
    fixTest(context: TestFixContext): Promise<TestGenerationResult>;
}
//# sourceMappingURL=test-generator.d.ts.map
/**
 * Parse LLM output to extract test code
 */
/**
 * Extract test code from LLM response
 * Handles markdown code blocks, plain code, and other formats
 */
export declare function parseTestCode(response: string): string;
/**
 * Validate that the parsed code looks like valid test code
 */
export declare function validateTestCodeStructure(code: string, framework: 'jest' | 'vitest'): {
    valid: boolean;
    errors: string[];
};
//# sourceMappingURL=parser.d.ts.map
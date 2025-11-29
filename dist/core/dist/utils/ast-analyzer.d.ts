import type { ChangedRange, TestTarget } from '../types/diff.js';
/**
 * Analyze TypeScript file and extract test targets
 */
export declare function analyzeFile(filePath: string, content: string, changedRanges: ChangedRange[], ref: string, githubClient: {
    fileExists: (ref: string, path: string) => Promise<boolean>;
}, testDirectory: string): Promise<TestTarget[]>;
//# sourceMappingURL=ast-analyzer.d.ts.map
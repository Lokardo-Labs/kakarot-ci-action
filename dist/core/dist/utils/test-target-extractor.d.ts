import type { PullRequestFile } from '../types/github.js';
import type { KakarotConfig } from '../types/config.js';
import type { TestTarget } from '../types/diff.js';
import { GitHubClient } from '../github/client.js';
/**
 * Extract test targets from pull request files
 */
export declare function extractTestTargets(files: PullRequestFile[], githubClient: GitHubClient, prHeadRef: string, config: Pick<KakarotConfig, 'testDirectory' | 'testFilePattern' | 'includePatterns' | 'excludePatterns'>): Promise<TestTarget[]>;
//# sourceMappingURL=test-target-extractor.d.ts.map
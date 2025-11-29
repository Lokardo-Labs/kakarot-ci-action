import type { PullRequest, PullRequestFile, FileContents, GitHubClientOptions, BatchCommitOptions } from '../types/github.js';
/**
 * GitHub API client wrapper with retry and rate-limit handling
 */
export declare class GitHubClient {
    private octokit;
    private owner;
    private repo;
    private maxRetries;
    private retryDelay;
    constructor(options: GitHubClientOptions);
    /**
     * Retry wrapper with exponential backoff
     */
    private withRetry;
    /**
     * Get pull request details
     */
    getPullRequest(prNumber: number): Promise<PullRequest>;
    /**
     * List all files changed in a pull request with patches
     */
    listPullRequestFiles(prNumber: number): Promise<PullRequestFile[]>;
    /**
     * Get file contents from a specific ref (branch, commit, etc.)
     */
    getFileContents(ref: string, path: string): Promise<FileContents>;
    /**
     * Commit multiple files in a single commit using Git tree API
     */
    commitFiles(options: BatchCommitOptions): Promise<string>;
    /**
     * Create a new branch from a base ref
     */
    createBranch(branchName: string, baseRef: string): Promise<string>;
    /**
     * Create a pull request
     */
    createPullRequest(title: string, body: string, head: string, base: string): Promise<PullRequest>;
    /**
     * Post a comment on a pull request
     */
    commentPR(prNumber: number, body: string): Promise<void>;
    /**
     * Check if a file exists in the repository
     */
    fileExists(ref: string, path: string): Promise<boolean>;
    /**
     * Get the current rate limit status
     */
    getRateLimit(): Promise<{
        remaining: number;
        reset: number;
    }>;
}
//# sourceMappingURL=client.d.ts.map
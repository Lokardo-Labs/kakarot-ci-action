import type { PullRequestFile } from '../types/github.js';
import type { FileDiff } from '../types/diff.js';
/**
 * Parse PR files into structured diff format
 */
export declare function parsePullRequestFiles(files: PullRequestFile[]): FileDiff[];
/**
 * Get changed line ranges for a file diff
 *
 * For added files: Requires fileContent to determine line count. Returns ranges
 * covering the entire file (all lines are additions in new files).
 *
 * For removed files: Returns empty (nothing to test in deleted files).
 *
 * For modified files: Returns merged ranges representing fuzzy zones of change.
 * Note: Deletion ranges use OLD file line numbers and should only be used for
 * metadata/context, not for overlap detection in the new file.
 */
export declare function getChangedRanges(diff: FileDiff, fileContent?: string): Array<{
    start: number;
    end: number;
    type: 'addition' | 'deletion';
}>;
//# sourceMappingURL=diff-parser.d.ts.map
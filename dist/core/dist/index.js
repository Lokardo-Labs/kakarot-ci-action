// src/types/config.ts
import { z } from "zod";
var KakarotConfigSchema = z.object({
  apiKey: z.string(),
  githubToken: z.string().optional(),
  provider: z.enum(["openai", "anthropic", "google"]).optional(),
  model: z.string().optional(),
  maxTokens: z.number().int().min(1).max(1e5).optional(),
  temperature: z.number().min(0).max(2).optional(),
  fixTemperature: z.number().min(0).max(2).optional(),
  maxFixAttempts: z.number().int().min(0).max(5).default(3),
  testLocation: z.enum(["separate", "co-located"]).default("separate"),
  testDirectory: z.string().default("__tests__"),
  testFilePattern: z.string().default("*.test.ts"),
  includePatterns: z.array(z.string()).default(["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"]),
  excludePatterns: z.array(z.string()).default(["**/*.test.ts", "**/*.spec.ts", "**/*.test.js", "**/*.spec.js", "**/node_modules/**"]),
  maxTestsPerPR: z.number().int().min(1).default(50),
  enableAutoCommit: z.boolean().default(true),
  commitStrategy: z.enum(["direct", "branch-pr"]).default("direct"),
  enablePRComments: z.boolean().default(true),
  debug: z.boolean().default(false)
});

// src/utils/config-loader.ts
import { existsSync, readFileSync } from "fs";
import { join, dirname } from "path";

// src/utils/logger.ts
var debugMode = false;
var jsonMode = false;
function initLogger(config) {
  debugMode = config.debug ?? process.env.KAKAROT_DEBUG === "true";
  jsonMode = process.env.KAKAROT_OUTPUT === "json";
}
function info(message, ...args) {
  if (jsonMode) {
    console.log(JSON.stringify({ level: "info", message, ...args }));
  } else {
    console.log(`[kakarot-ci] ${message}`, ...args);
  }
}
function debug(message, ...args) {
  if (debugMode) {
    if (jsonMode) {
      console.debug(JSON.stringify({ level: "debug", message, ...args }));
    } else {
      console.debug(`[kakarot-ci:debug] ${message}`, ...args);
    }
  }
}
function warn(message, ...args) {
  if (jsonMode) {
    console.warn(JSON.stringify({ level: "warn", message, ...args }));
  } else {
    console.warn(`[kakarot-ci] \u26A0 ${message}`, ...args);
  }
}
function error(message, ...args) {
  if (jsonMode) {
    console.error(JSON.stringify({ level: "error", message, ...args }));
  } else {
    console.error(`[kakarot-ci] \u2717 ${message}`, ...args);
  }
}
function success(message, ...args) {
  if (jsonMode) {
    console.log(JSON.stringify({ level: "success", message, ...args }));
  } else {
    console.log(`[kakarot-ci] \u2713 ${message}`, ...args);
  }
}
function progress(step, total, message, ...args) {
  if (jsonMode) {
    console.log(JSON.stringify({ level: "info", step, total, message, ...args }));
  } else {
    console.log(`[kakarot-ci] Step ${step}/${total}: ${message}`, ...args);
  }
}

// src/utils/config-loader.ts
function findProjectRoot(startPath) {
  const start = startPath ?? process.cwd();
  let current = start;
  let previous = null;
  while (current !== previous) {
    if (existsSync(join(current, "package.json"))) {
      return current;
    }
    previous = current;
    current = dirname(current);
  }
  return start;
}
async function loadTypeScriptConfig(root) {
  const configPath = join(root, "kakarot.config.ts");
  if (!existsSync(configPath)) {
    return null;
  }
  try {
    const configModule = await import(configPath);
    return configModule.default || configModule.config || null;
  } catch (err) {
    error(`Failed to load kakarot.config.ts: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}
async function loadJavaScriptConfig(root) {
  const configPath = join(root, ".kakarot-ci.config.js");
  if (!existsSync(configPath)) {
    return null;
  }
  try {
    const configModule = await import(configPath);
    return configModule.default || configModule.config || null;
  } catch (err) {
    error(`Failed to load .kakarot-ci.config.js: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}
function loadJsonConfig(root) {
  const configPath = join(root, ".kakarot-ci.config.json");
  if (!existsSync(configPath)) {
    return null;
  }
  try {
    const content = readFileSync(configPath, "utf-8");
    return JSON.parse(content);
  } catch (err) {
    error(`Failed to load .kakarot-ci.config.json: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}
function loadPackageJsonConfig(root) {
  const packagePath = join(root, "package.json");
  if (!existsSync(packagePath)) {
    return null;
  }
  try {
    const content = readFileSync(packagePath, "utf-8");
    const pkg = JSON.parse(content);
    return pkg.kakarotCi || null;
  } catch (err) {
    error(`Failed to load package.json: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}
function mergeEnvConfig(config) {
  const merged = { ...config };
  if (!merged.apiKey && process.env.KAKAROT_API_KEY) {
    merged.apiKey = process.env.KAKAROT_API_KEY;
  }
  if (!merged.githubToken && process.env.GITHUB_TOKEN) {
    merged.githubToken = process.env.GITHUB_TOKEN;
  }
  return merged;
}
async function loadConfig() {
  const projectRoot = findProjectRoot();
  let config = null;
  config = await loadTypeScriptConfig(projectRoot);
  if (config) {
    return KakarotConfigSchema.parse(mergeEnvConfig(config));
  }
  config = await loadJavaScriptConfig(projectRoot);
  if (config) {
    return KakarotConfigSchema.parse(mergeEnvConfig(config));
  }
  config = loadJsonConfig(projectRoot);
  if (config) {
    return KakarotConfigSchema.parse(mergeEnvConfig(config));
  }
  config = loadPackageJsonConfig(projectRoot);
  if (config) {
    return KakarotConfigSchema.parse(mergeEnvConfig(config));
  }
  const envConfig = mergeEnvConfig({});
  try {
    return KakarotConfigSchema.parse(envConfig);
  } catch (err) {
    error(
      "Missing required apiKey. Provide it via:\n  - Config file (kakarot.config.ts, .kakarot-ci.config.js/json, or package.json)\n  - Environment variable: KAKAROT_API_KEY"
    );
    throw err;
  }
}

// src/github/client.ts
import { Octokit } from "@octokit/rest";
var GitHubClient = class {
  // 1 second
  constructor(options) {
    this.maxRetries = 3;
    this.retryDelay = 1e3;
    this.owner = options.owner;
    this.repo = options.repo;
    this.octokit = new Octokit({
      auth: options.token,
      request: {
        retries: this.maxRetries,
        retryAfter: this.retryDelay / 1e3
      }
    });
  }
  /**
   * Retry wrapper with exponential backoff
   */
  async withRetry(fn, operation, retries = this.maxRetries) {
    try {
      return await fn();
    } catch (err) {
      if (retries <= 0) {
        error(`${operation} failed after ${this.maxRetries} retries: ${err instanceof Error ? err.message : String(err)}`);
        throw err;
      }
      const isRateLimit = err instanceof Error && err.message.includes("rate limit");
      const isServerError = err instanceof Error && (err.message.includes("500") || err.message.includes("502") || err.message.includes("503") || err.message.includes("504"));
      if (isRateLimit || isServerError) {
        const delay = this.retryDelay * Math.pow(2, this.maxRetries - retries);
        warn(`${operation} failed, retrying in ${delay}ms... (${retries} retries left)`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.withRetry(fn, operation, retries - 1);
      }
      throw err;
    }
  }
  /**
   * Get pull request details
   */
  async getPullRequest(prNumber) {
    return this.withRetry(async () => {
      debug(`Fetching PR #${prNumber}`);
      const response = await this.octokit.rest.pulls.get({
        owner: this.owner,
        repo: this.repo,
        pull_number: prNumber
      });
      return response.data;
    }, `getPullRequest(${prNumber})`);
  }
  /**
   * List all files changed in a pull request with patches
   */
  async listPullRequestFiles(prNumber) {
    return this.withRetry(async () => {
      debug(`Fetching files for PR #${prNumber}`);
      const response = await this.octokit.rest.pulls.listFiles({
        owner: this.owner,
        repo: this.repo,
        pull_number: prNumber
      });
      return response.data.map((file) => ({
        filename: file.filename,
        status: file.status,
        additions: file.additions,
        deletions: file.deletions,
        changes: file.changes,
        patch: file.patch || void 0,
        previous_filename: file.previous_filename || void 0
      }));
    }, `listPullRequestFiles(${prNumber})`);
  }
  /**
   * Get file contents from a specific ref (branch, commit, etc.)
   */
  async getFileContents(ref, path) {
    return this.withRetry(async () => {
      debug(`Fetching file contents: ${path}@${ref}`);
      const response = await this.octokit.rest.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path,
        ref
      });
      if (Array.isArray(response.data)) {
        throw new Error(`Expected file but got directory: ${path}`);
      }
      const data = response.data;
      let content;
      if (data.encoding === "base64") {
        content = Buffer.from(data.content, "base64").toString("utf-8");
      } else {
        content = data.content;
      }
      return {
        content,
        encoding: data.encoding,
        sha: data.sha,
        size: data.size
      };
    }, `getFileContents(${ref}, ${path})`);
  }
  /**
   * Commit multiple files in a single commit using Git tree API
   */
  async commitFiles(options) {
    return this.withRetry(async () => {
      debug(`Committing ${options.files.length} file(s) to branch ${options.branch}`);
      const baseCommit = await this.octokit.rest.repos.getCommit({
        owner: this.owner,
        repo: this.repo,
        ref: options.baseSha
      });
      const baseTreeSha = baseCommit.data.commit.tree.sha;
      const blobPromises = options.files.map(async (file) => {
        const blobResponse = await this.octokit.rest.git.createBlob({
          owner: this.owner,
          repo: this.repo,
          content: Buffer.from(file.content, "utf-8").toString("base64"),
          encoding: "base64"
        });
        return {
          path: file.path,
          sha: blobResponse.data.sha,
          mode: "100644",
          type: "blob"
        };
      });
      const treeItems = await Promise.all(blobPromises);
      const treeResponse = await this.octokit.rest.git.createTree({
        owner: this.owner,
        repo: this.repo,
        base_tree: baseTreeSha,
        tree: treeItems
      });
      const commitResponse = await this.octokit.rest.git.createCommit({
        owner: this.owner,
        repo: this.repo,
        message: options.message,
        tree: treeResponse.data.sha,
        parents: [options.baseSha]
      });
      await this.octokit.rest.git.updateRef({
        owner: this.owner,
        repo: this.repo,
        ref: `heads/${options.branch}`,
        sha: commitResponse.data.sha
      });
      return commitResponse.data.sha;
    }, `commitFiles(${options.files.length} files)`);
  }
  /**
   * Create a new branch from a base ref
   */
  async createBranch(branchName, baseRef) {
    return this.withRetry(async () => {
      debug(`Creating branch ${branchName} from ${baseRef}`);
      const baseRefResponse = await this.octokit.rest.git.getRef({
        owner: this.owner,
        repo: this.repo,
        ref: baseRef.startsWith("refs/") ? baseRef : `heads/${baseRef}`
      });
      const baseSha = baseRefResponse.data.object.sha;
      await this.octokit.rest.git.createRef({
        owner: this.owner,
        repo: this.repo,
        ref: `refs/heads/${branchName}`,
        sha: baseSha
      });
      return baseSha;
    }, `createBranch(${branchName})`);
  }
  /**
   * Create a pull request
   */
  async createPullRequest(title, body, head, base) {
    return this.withRetry(async () => {
      debug(`Creating PR: ${head} -> ${base}`);
      const response = await this.octokit.rest.pulls.create({
        owner: this.owner,
        repo: this.repo,
        title,
        body,
        head,
        base
      });
      return response.data;
    }, `createPullRequest(${head} -> ${base})`);
  }
  /**
   * Post a comment on a pull request
   */
  async commentPR(prNumber, body) {
    await this.withRetry(async () => {
      debug(`Posting comment on PR #${prNumber}`);
      await this.octokit.rest.issues.createComment({
        owner: this.owner,
        repo: this.repo,
        issue_number: prNumber,
        body
      });
    }, `commentPR(${prNumber})`);
  }
  /**
   * Check if a file exists in the repository
   */
  async fileExists(ref, path) {
    return this.withRetry(async () => {
      try {
        await this.octokit.rest.repos.getContent({
          owner: this.owner,
          repo: this.repo,
          path,
          ref
        });
        return true;
      } catch (err) {
        if (err instanceof Error && err.message.includes("404")) {
          return false;
        }
        throw err;
      }
    }, `fileExists(${ref}, ${path})`);
  }
  /**
   * Get the current rate limit status
   */
  async getRateLimit() {
    const response = await this.octokit.rest.rateLimit.get();
    return {
      remaining: response.data.rate.remaining,
      reset: response.data.rate.reset
    };
  }
};

// src/utils/diff-parser.ts
function parseUnifiedDiff(patch) {
  const hunks = [];
  const lines = patch.split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const hunkMatch = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
    if (hunkMatch) {
      const oldStart = parseInt(hunkMatch[1], 10);
      const oldLines = parseInt(hunkMatch[2] || "1", 10);
      const newStart = parseInt(hunkMatch[3], 10);
      const newLines = parseInt(hunkMatch[4] || "1", 10);
      const hunkLines = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("@@")) {
        hunkLines.push(lines[i]);
        i++;
      }
      hunks.push({
        oldStart,
        oldLines,
        newStart,
        newLines,
        lines: hunkLines
      });
    } else {
      i++;
    }
  }
  return hunks;
}
function hunksToChangedRanges(hunks) {
  const ranges = [];
  for (const hunk of hunks) {
    let oldLine = hunk.oldStart;
    let newLine = hunk.newStart;
    for (const line of hunk.lines) {
      if (line.startsWith("+") && !line.startsWith("+++")) {
        ranges.push({
          start: newLine,
          end: newLine,
          type: "addition"
        });
        newLine++;
      } else if (line.startsWith("-") && !line.startsWith("---")) {
        ranges.push({
          start: oldLine,
          end: oldLine,
          type: "deletion"
        });
        oldLine++;
      } else if (!line.startsWith("\\")) {
        oldLine++;
        newLine++;
      }
    }
  }
  return mergeRanges(ranges);
}
function mergeRanges(ranges) {
  if (ranges.length === 0)
    return [];
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const merged = [];
  let current = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i];
    if (next.start <= current.end + 2 && next.type === current.type) {
      current = {
        start: current.start,
        end: Math.max(current.end, next.end),
        type: current.type
      };
    } else {
      merged.push(current);
      current = next;
    }
  }
  merged.push(current);
  return merged;
}
function parsePullRequestFiles(files) {
  const diffs = [];
  for (const file of files) {
    if (!file.filename.match(/\.(ts|tsx|js|jsx)$/)) {
      continue;
    }
    if (!file.patch) {
      diffs.push({
        filename: file.filename,
        status: file.status,
        hunks: [],
        additions: file.additions,
        deletions: file.deletions
      });
      continue;
    }
    const hunks = parseUnifiedDiff(file.patch);
    diffs.push({
      filename: file.filename,
      status: file.status,
      hunks,
      additions: file.additions,
      deletions: file.deletions
    });
    debug(`Parsed ${hunks.length} hunk(s) for ${file.filename}`);
  }
  return diffs;
}
function getChangedRanges(diff, fileContent) {
  if (diff.status === "added") {
    if (!fileContent) {
      throw new Error("fileContent is required for added files to determine line count");
    }
    const lineCount = fileContent.split("\n").length;
    return [{ start: 1, end: lineCount, type: "addition" }];
  }
  if (diff.status === "removed") {
    return [];
  }
  return hunksToChangedRanges(diff.hunks);
}

// src/utils/ast-analyzer.ts
import * as ts from "typescript";
function extractFunctions(sourceFile) {
  const functions = [];
  function visit(node) {
    if (ts.isFunctionDeclaration(node)) {
      const isExported = node.modifiers?.some(
        (m) => m.kind === ts.SyntaxKind.ExportKeyword || m.kind === ts.SyntaxKind.DefaultKeyword
      );
      if (node.name) {
        functions.push({
          name: node.name.text,
          type: "function",
          start: node.getStart(sourceFile),
          end: node.getEnd(),
          node
        });
      } else if (isExported) {
        functions.push({
          name: "default",
          type: "function",
          start: node.getStart(sourceFile),
          end: node.getEnd(),
          node
        });
      }
    }
    if (ts.isExportAssignment(node) && node.isExportEquals === false && ts.isFunctionExpression(node.expression)) {
      const func = node.expression;
      const name = func.name ? func.name.text : "default";
      functions.push({
        name,
        type: "function",
        start: node.getStart(sourceFile),
        end: node.getEnd(),
        node
      });
    }
    if (ts.isMethodDeclaration(node) && node.name && ts.isIdentifier(node.name)) {
      functions.push({
        name: node.name.text,
        type: "class-method",
        start: node.getStart(sourceFile),
        end: node.getEnd(),
        node
      });
    }
    if (ts.isVariableStatement(node)) {
      for (const declaration of node.declarationList.declarations) {
        if (declaration.initializer) {
          if (ts.isArrowFunction(declaration.initializer)) {
            if (ts.isIdentifier(declaration.name)) {
              functions.push({
                name: declaration.name.text,
                type: "arrow-function",
                start: declaration.getStart(sourceFile),
                end: declaration.getEnd(),
                node: declaration
              });
            }
          } else if (ts.isFunctionExpression(declaration.initializer)) {
            const funcExpr = declaration.initializer;
            const name = funcExpr.name ? funcExpr.name.text : ts.isIdentifier(declaration.name) ? declaration.name.text : "anonymous";
            if (name !== "anonymous") {
              functions.push({
                name,
                type: "function",
                start: declaration.getStart(sourceFile),
                end: declaration.getEnd(),
                node: declaration
              });
            }
          }
        }
      }
    }
    if (ts.isPropertyAssignment(node) && ts.isIdentifier(node.name)) {
      if (ts.isFunctionExpression(node.initializer) || ts.isArrowFunction(node.initializer)) {
        functions.push({
          name: node.name.text,
          type: "method",
          start: node.getStart(sourceFile),
          end: node.getEnd(),
          node
        });
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return functions;
}
function getLineNumber(source, position) {
  return source.substring(0, position).split("\n").length;
}
function functionOverlapsChanges(func, changedRanges, source) {
  const funcStartLine = getLineNumber(source, func.start);
  const funcEndLine = getLineNumber(source, func.end);
  const additionRanges = changedRanges.filter((r) => r.type === "addition");
  for (const range of additionRanges) {
    if (range.start >= funcStartLine && range.start <= funcEndLine || range.end >= funcStartLine && range.end <= funcEndLine || range.start <= funcStartLine && range.end >= funcEndLine) {
      return true;
    }
  }
  return false;
}
function extractCodeSnippet(source, func) {
  return source.substring(func.start, func.end);
}
function extractContext(source, func, allFunctions) {
  const funcStartLine = getLineNumber(source, func.start);
  const funcEndLine = getLineNumber(source, func.end);
  const previousFunc = allFunctions.filter((f) => getLineNumber(source, f.end) < funcStartLine).sort((a, b) => getLineNumber(source, b.end) - getLineNumber(source, a.end))[0];
  const contextStart = previousFunc ? getLineNumber(source, previousFunc.start) : Math.max(1, funcStartLine - 10);
  const lines = source.split("\n");
  const contextLines = lines.slice(contextStart - 1, funcEndLine + 5);
  return contextLines.join("\n");
}
async function detectTestFile(filePath, ref, githubClient, testDirectory) {
  const dir = filePath.substring(0, filePath.lastIndexOf("/"));
  const baseName = filePath.substring(filePath.lastIndexOf("/") + 1).replace(/\.(ts|tsx|js|jsx)$/, "");
  let ext;
  if (filePath.endsWith(".tsx"))
    ext = "tsx";
  else if (filePath.endsWith(".jsx"))
    ext = "jsx";
  else if (filePath.endsWith(".ts"))
    ext = "ts";
  else
    ext = "js";
  const testPatterns = ext === "tsx" ? [`.test.tsx`, `.spec.tsx`, `.test.ts`, `.spec.ts`] : ext === "jsx" ? [`.test.jsx`, `.spec.jsx`, `.test.js`, `.spec.js`] : ext === "ts" ? [`.test.ts`, `.spec.ts`] : [`.test.js`, `.spec.js`];
  const locations = [
    // Co-located in same directory
    ...testPatterns.map((pattern) => `${dir}/${baseName}${pattern}`),
    // Co-located __tests__ directory
    ...testPatterns.map((pattern) => `${dir}/__tests__/${baseName}${pattern}`),
    // Test directory at root
    ...testPatterns.map((pattern) => `${testDirectory}/${baseName}${pattern}`),
    // Nested test directory matching source structure
    ...testPatterns.map((pattern) => `${testDirectory}${dir}/${baseName}${pattern}`),
    // __tests__ at root
    ...testPatterns.map((pattern) => `__tests__/${baseName}${pattern}`)
  ];
  for (const testPath of locations) {
    const exists = await githubClient.fileExists(ref, testPath);
    if (exists) {
      return testPath;
    }
  }
  return void 0;
}
async function analyzeFile(filePath, content, changedRanges, ref, githubClient, testDirectory) {
  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true
  );
  const functions = extractFunctions(sourceFile);
  const existingTestFile = await detectTestFile(filePath, ref, githubClient, testDirectory);
  const targets = [];
  for (const func of functions) {
    if (functionOverlapsChanges(func, changedRanges, content)) {
      const startLine = getLineNumber(content, func.start);
      const endLine = getLineNumber(content, func.end);
      targets.push({
        filePath,
        functionName: func.name,
        functionType: func.type,
        startLine,
        endLine,
        code: extractCodeSnippet(content, func),
        context: extractContext(content, func, functions),
        existingTestFile,
        changedRanges: changedRanges.filter(
          (r) => r.start >= startLine && r.end <= endLine
        )
      });
      debug(`Found test target: ${func.name} (${func.type}) in ${filePath}${existingTestFile ? ` - existing test: ${existingTestFile}` : ""}`);
    }
  }
  return targets;
}

// src/utils/test-target-extractor.ts
async function extractTestTargets(files, githubClient, prHeadRef, config) {
  info(`Analyzing ${files.length} file(s) for test targets`);
  const diffs = parsePullRequestFiles(files);
  const filteredDiffs = diffs.filter((diff) => {
    const matchesInclude = config.includePatterns.some((pattern) => {
      const regex = new RegExp(pattern.replace(/\*\*/g, ".*").replace(/\*/g, "[^/]*"));
      return regex.test(diff.filename);
    });
    if (!matchesInclude)
      return false;
    const matchesExclude = config.excludePatterns.some((pattern) => {
      const regex = new RegExp(pattern.replace(/\*\*/g, ".*").replace(/\*/g, "[^/]*"));
      return regex.test(diff.filename);
    });
    return !matchesExclude;
  });
  debug(`Filtered to ${filteredDiffs.length} file(s) after pattern matching`);
  const targets = [];
  for (const diff of filteredDiffs) {
    if (diff.status === "removed") {
      continue;
    }
    try {
      const fileContents = await githubClient.getFileContents(prHeadRef, diff.filename);
      const changedRanges = getChangedRanges(diff, fileContents.content);
      if (changedRanges.length === 0) {
        continue;
      }
      const ranges = changedRanges.map((r) => ({
        start: r.start,
        end: r.end,
        type: r.type
      }));
      const fileTargets = await analyzeFile(
        diff.filename,
        fileContents.content,
        ranges,
        prHeadRef,
        githubClient,
        config.testDirectory
      );
      targets.push(...fileTargets);
      if (fileTargets.length > 0) {
        info(`Found ${fileTargets.length} test target(s) in ${diff.filename}`);
      }
    } catch (error2) {
      debug(`Failed to analyze ${diff.filename}: ${error2 instanceof Error ? error2.message : String(error2)}`);
    }
  }
  info(`Extracted ${targets.length} total test target(s)`);
  return targets;
}

// src/llm/providers/base.ts
var BaseLLMProvider = class {
  constructor(apiKey, model, defaultOptions) {
    this.apiKey = apiKey;
    this.model = model;
    this.defaultOptions = {
      temperature: defaultOptions?.temperature ?? 0.2,
      maxTokens: defaultOptions?.maxTokens ?? 4e3,
      stopSequences: defaultOptions?.stopSequences ?? []
    };
  }
  mergeOptions(options) {
    return {
      temperature: options?.temperature ?? this.defaultOptions.temperature,
      maxTokens: options?.maxTokens ?? this.defaultOptions.maxTokens,
      stopSequences: options?.stopSequences ?? this.defaultOptions.stopSequences
    };
  }
  validateApiKey() {
    if (!this.apiKey || this.apiKey.trim().length === 0) {
      error("LLM API key is required but not provided");
      throw new Error("LLM API key is required");
    }
  }
  logUsage(usage, operation) {
    if (usage) {
      debug(
        `${operation} usage: ${usage.totalTokens ?? "unknown"} tokens (prompt: ${usage.promptTokens ?? "unknown"}, completion: ${usage.completionTokens ?? "unknown"})`
      );
    }
  }
};

// src/llm/providers/openai.ts
var OpenAIProvider = class extends BaseLLMProvider {
  constructor() {
    super(...arguments);
    this.baseUrl = "https://api.openai.com/v1";
  }
  async generate(messages, options) {
    this.validateApiKey();
    const mergedOptions = this.mergeOptions(options);
    const requestBody = {
      model: this.model,
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content
      })),
      temperature: mergedOptions.temperature,
      max_tokens: mergedOptions.maxTokens,
      ...mergedOptions.stopSequences.length > 0 && { stop: mergedOptions.stopSequences }
    };
    debug(`Calling OpenAI API with model: ${this.model}`);
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(requestBody)
      });
      if (!response.ok) {
        const errorText = await response.text();
        error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`);
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      if (!data.choices || data.choices.length === 0) {
        error("OpenAI API returned no choices");
        throw new Error("OpenAI API returned no choices");
      }
      const content = data.choices[0]?.message?.content ?? "";
      const usage = data.usage ? {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens
      } : void 0;
      this.logUsage(usage, "OpenAI");
      return {
        content,
        usage
      };
    } catch (err) {
      if (err instanceof Error) {
        error(`OpenAI API request failed: ${err.message}`);
        throw err;
      }
      throw new Error("Unknown error calling OpenAI API");
    }
  }
};

// src/llm/providers/anthropic.ts
var AnthropicProvider = class extends BaseLLMProvider {
  constructor() {
    super(...arguments);
    this.baseUrl = "https://api.anthropic.com/v1";
  }
  async generate(messages, options) {
    this.validateApiKey();
    const mergedOptions = this.mergeOptions(options);
    const systemMessage = messages.find((m) => m.role === "system")?.content ?? "";
    const conversationMessages = messages.filter((m) => m.role !== "system");
    const requestBody = {
      model: this.model,
      max_tokens: mergedOptions.maxTokens,
      temperature: mergedOptions.temperature,
      messages: conversationMessages.map((msg) => ({
        role: msg.role === "assistant" ? "assistant" : "user",
        content: msg.content
      })),
      ...systemMessage && { system: systemMessage },
      ...mergedOptions.stopSequences.length > 0 && { stop_sequences: mergedOptions.stopSequences }
    };
    debug(`Calling Anthropic API with model: ${this.model}`);
    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify(requestBody)
      });
      if (!response.ok) {
        const errorText = await response.text();
        error(`Anthropic API error: ${response.status} ${response.statusText} - ${errorText}`);
        throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      if (!data.content || data.content.length === 0) {
        error("Anthropic API returned no content");
        throw new Error("Anthropic API returned no content");
      }
      const content = data.content.map((c) => c.text).join("\n");
      const usage = data.usage ? {
        promptTokens: data.usage.input_tokens,
        completionTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens
      } : void 0;
      this.logUsage(usage, "Anthropic");
      return {
        content,
        usage
      };
    } catch (err) {
      if (err instanceof Error) {
        error(`Anthropic API request failed: ${err.message}`);
        throw err;
      }
      throw new Error("Unknown error calling Anthropic API");
    }
  }
};

// src/llm/providers/google.ts
var GoogleProvider = class extends BaseLLMProvider {
  constructor() {
    super(...arguments);
    this.baseUrl = "https://generativelanguage.googleapis.com/v1beta";
  }
  async generate(messages, options) {
    this.validateApiKey();
    const mergedOptions = this.mergeOptions(options);
    const systemInstruction = messages.find((m) => m.role === "system")?.content;
    const conversationMessages = messages.filter((m) => m.role !== "system");
    const contents = conversationMessages.map((msg) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }]
    }));
    const generationConfig = {
      temperature: mergedOptions.temperature,
      maxOutputTokens: mergedOptions.maxTokens,
      ...mergedOptions.stopSequences.length > 0 && { stopSequences: mergedOptions.stopSequences }
    };
    const requestBody = {
      contents,
      generationConfig,
      ...systemInstruction && { systemInstruction: { parts: [{ text: systemInstruction }] } }
    };
    debug(`Calling Google API with model: ${this.model}`);
    try {
      const response = await fetch(`${this.baseUrl}/${this.model}:generateContent?key=${this.apiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody)
      });
      if (!response.ok) {
        const errorText = await response.text();
        error(`Google API error: ${response.status} ${response.statusText} - ${errorText}`);
        throw new Error(`Google API error: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      if (!data.candidates || data.candidates.length === 0) {
        error("Google API returned no candidates");
        throw new Error("Google API returned no candidates");
      }
      const content = data.candidates[0]?.content?.parts?.map((p) => p.text).join("\n") ?? "";
      const usage = data.usageMetadata ? {
        promptTokens: data.usageMetadata.promptTokenCount,
        completionTokens: data.usageMetadata.candidatesTokenCount,
        totalTokens: data.usageMetadata.totalTokenCount
      } : void 0;
      this.logUsage(usage, "Google");
      return {
        content,
        usage
      };
    } catch (err) {
      if (err instanceof Error) {
        error(`Google API request failed: ${err.message}`);
        throw err;
      }
      throw new Error("Unknown error calling Google API");
    }
  }
};

// src/llm/factory.ts
function createLLMProvider(config) {
  const provider = config.provider ?? "openai";
  const model = config.model ?? getDefaultModel(provider);
  const defaultOptions = config.maxTokens ? { maxTokens: config.maxTokens } : void 0;
  switch (provider) {
    case "openai":
      return new OpenAIProvider(config.apiKey, model, defaultOptions);
    case "anthropic":
      return new AnthropicProvider(config.apiKey, model, defaultOptions);
    case "google":
      return new GoogleProvider(config.apiKey, model, defaultOptions);
    default:
      error(`Unknown LLM provider: ${provider}`);
      throw new Error(`Unknown LLM provider: ${provider}`);
  }
}
function getDefaultModel(provider) {
  switch (provider) {
    case "openai":
      return "gpt-4-turbo-preview";
    case "anthropic":
      return "claude-3-5-sonnet-20241022";
    case "google":
      return "gemini-1.5-pro";
    default:
      return "gpt-4-turbo-preview";
  }
}

// src/llm/prompts/test-generation.ts
function buildTestGenerationPrompt(context) {
  const { target, framework, existingTestFile, relatedFunctions } = context;
  const systemPrompt = buildSystemPrompt(framework);
  const userPrompt = buildUserPrompt(target, framework, existingTestFile, relatedFunctions);
  return [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt }
  ];
}
function buildSystemPrompt(framework) {
  const frameworkName = framework === "jest" ? "Jest" : "Vitest";
  const importStatement = framework === "jest" ? "import { describe, it, expect } from 'jest';" : "import { describe, it, expect } from 'vitest';";
  return `You are an expert ${frameworkName} test writer. Your task is to generate comprehensive unit tests for TypeScript/JavaScript functions.

Requirements:
1. Generate complete, runnable ${frameworkName} test code
2. Use ${frameworkName} syntax and best practices
3. Test edge cases, error conditions, and normal operation
4. Use descriptive test names that explain what is being tested
5. Include proper setup/teardown if needed
6. Mock external dependencies appropriately
7. Test both success and failure scenarios
8. Follow the existing test file structure if one exists

Output format:
- Return ONLY the test code, no explanations or markdown code blocks
- The code should be ready to run in a ${frameworkName} environment
- Include necessary imports at the top
- Use proper TypeScript types if the source code uses TypeScript

${frameworkName} example structure:
${importStatement}

describe('FunctionName', () => {
  it('should handle normal case', () => {
    // test implementation
  });

  it('should handle edge case', () => {
    // test implementation
  });
});`;
}
function buildUserPrompt(target, framework, existingTestFile, relatedFunctions) {
  let prompt = `Generate ${framework} unit tests for the following function:

`;
  prompt += `File: ${target.filePath}
`;
  prompt += `Function: ${target.functionName}
`;
  prompt += `Type: ${target.functionType}

`;
  prompt += `Function code:
\`\`\`typescript
${target.code}
\`\`\`

`;
  if (target.context) {
    prompt += `Context (surrounding code):
\`\`\`typescript
${target.context}
\`\`\`

`;
  }
  if (relatedFunctions && relatedFunctions.length > 0) {
    prompt += `Related functions (for context):
`;
    relatedFunctions.forEach((fn) => {
      prompt += `
${fn.name}:
\`\`\`typescript
${fn.code}
\`\`\`
`;
    });
    prompt += "\n";
  }
  if (existingTestFile) {
    prompt += `Existing test file structure (follow this pattern):
\`\`\`typescript
${existingTestFile}
\`\`\`

`;
    prompt += `Note: Add new tests to this file, maintaining the existing structure and style.

`;
  }
  prompt += `Generate comprehensive unit tests for ${target.functionName}. Include:
`;
  prompt += `- Tests for normal operation with various inputs
`;
  prompt += `- Tests for edge cases (null, undefined, empty arrays, etc.)
`;
  prompt += `- Tests for error conditions if applicable
`;
  prompt += `- Tests for boundary conditions
`;
  prompt += `- Proper mocking of dependencies if needed

`;
  prompt += `Return ONLY the test code, no explanations or markdown formatting.`;
  return prompt;
}

// src/llm/prompts/test-fix.ts
function buildTestFixPrompt(context) {
  const { testCode, errorMessage, testOutput, originalCode, framework, attempt, maxAttempts } = context;
  const systemPrompt = buildSystemPrompt2(framework, attempt, maxAttempts);
  const userPrompt = buildUserPrompt2(testCode, errorMessage, testOutput, originalCode, framework, attempt);
  return [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt }
  ];
}
function buildSystemPrompt2(framework, attempt, maxAttempts) {
  const frameworkName = framework === "jest" ? "Jest" : "Vitest";
  return `You are an expert ${frameworkName} test debugger. Your task is to fix failing unit tests.

Context:
- This is fix attempt ${attempt} of ${maxAttempts}
- The test code failed to run or produced incorrect results
- You need to analyze the error and fix the test code

Requirements:
1. Fix the test code to make it pass
2. Maintain the original test intent
3. Use proper ${frameworkName} syntax
4. Ensure all imports and dependencies are correct
5. Fix any syntax errors, type errors, or logical errors
6. If the original code being tested has issues, note that but focus on fixing the test

Output format:
- Return ONLY the fixed test code, no explanations or markdown code blocks
- The code should be complete and runnable
- Include all necessary imports`;
}
function buildUserPrompt2(testCode, errorMessage, testOutput, originalCode, framework, attempt) {
  let prompt = `The following ${framework} test is failing. Fix it:

`;
  prompt += `Original function code:
\`\`\`typescript
${originalCode}
\`\`\`

`;
  prompt += `Failing test code:
\`\`\`typescript
${testCode}
\`\`\`

`;
  prompt += `Error message:
\`\`\`
${errorMessage}
\`\`\`

`;
  if (testOutput) {
    prompt += `Test output:
\`\`\`
${testOutput}
\`\`\`

`;
  }
  if (attempt > 1) {
    prompt += `Note: This is fix attempt ${attempt}. Previous attempts failed. Please analyze the error more carefully.

`;
  }
  prompt += `Fix the test code to resolve the error. Return ONLY the corrected test code, no explanations.`;
  return prompt;
}

// src/llm/parser.ts
function parseTestCode(response) {
  let code = response.trim();
  const codeBlockRegex = /^```(?:typescript|ts|javascript|js)?\s*\n([\s\S]*?)\n```$/;
  const match = code.match(codeBlockRegex);
  if (match) {
    code = match[1].trim();
  } else {
    const inlineCodeRegex = /```([\s\S]*?)```/g;
    const inlineMatches = Array.from(code.matchAll(inlineCodeRegex));
    if (inlineMatches.length > 0) {
      code = inlineMatches.reduce((largest, match2) => {
        return match2[1].length > largest.length ? match2[1] : largest;
      }, "");
      code = code.trim();
    }
  }
  const explanationPatterns = [
    /^Here'?s?\s+(?:the\s+)?(?:test\s+)?code:?\s*/i,
    /^Test\s+code:?\s*/i,
    /^Generated\s+test:?\s*/i,
    /^Here\s+is\s+the\s+test:?\s*/i
  ];
  for (const pattern of explanationPatterns) {
    if (pattern.test(code)) {
      code = code.replace(pattern, "").trim();
      const codeBlockMatch = code.match(/```[\s\S]*?```/);
      if (codeBlockMatch) {
        code = codeBlockMatch[0];
        code = code.replace(/^```(?:typescript|ts|javascript|js)?\s*\n?/, "").replace(/\n?```$/, "").trim();
      }
    }
  }
  code = code.replace(/^```[\w]*\n?/, "").replace(/\n?```$/, "").trim();
  if (!code) {
    warn("Failed to extract test code from LLM response");
    return response;
  }
  return code;
}
function validateTestCodeStructure(code, framework) {
  const errors = [];
  if (!code.includes("describe") && !code.includes("it(") && !code.includes("test(")) {
    errors.push("Missing test structure (describe/it/test)");
  }
  if (framework === "jest") {
    if (!code.includes("from 'jest'") && !code.includes('from "jest"') && !code.includes("require(")) {
      if (!code.includes("describe") && !code.includes("it") && !code.includes("test")) {
        errors.push("Missing Jest test functions");
      }
    }
  } else if (framework === "vitest") {
    if (!code.includes("from 'vitest'") && !code.includes('from "vitest"')) {
      errors.push("Missing Vitest import");
    }
  }
  if (code.trim().length < 20) {
    errors.push("Test code appears too short or empty");
  }
  if (!code.match(/(describe|it|test)\s*\(/)) {
    errors.push("Missing test function calls (describe/it/test)");
  }
  return {
    valid: errors.length === 0,
    errors
  };
}

// src/llm/test-generator.ts
var TestGenerator = class {
  constructor(config) {
    this.provider = createLLMProvider(config);
    this.config = {
      maxFixAttempts: config.maxFixAttempts,
      temperature: config.temperature,
      fixTemperature: config.fixTemperature
    };
  }
  /**
   * Generate test code for a test target
   */
  async generateTest(context) {
    const { target, framework } = context;
    info(`Generating ${framework} tests for ${target.functionName} in ${target.filePath}`);
    try {
      const messages = buildTestGenerationPrompt(context);
      debug(`Sending test generation request to LLM for ${target.functionName}`);
      const response = await this.provider.generate(messages, {
        temperature: this.config.temperature ?? 0.2,
        // Lower temperature for more consistent test generation
        maxTokens: 4e3
      });
      const testCode = parseTestCode(response.content);
      const validation = validateTestCodeStructure(testCode, framework);
      if (!validation.valid) {
        warn(`Test code validation warnings for ${target.functionName}: ${validation.errors.join(", ")}`);
      }
      debug(`Successfully generated test code for ${target.functionName}`);
      return {
        testCode,
        explanation: response.content !== testCode ? "Code extracted from LLM response" : void 0,
        usage: response.usage
      };
    } catch (err) {
      error(`Failed to generate test for ${target.functionName}: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  }
  /**
   * Fix a failing test by generating a corrected version
   */
  async fixTest(context) {
    const { framework, attempt } = context;
    info(`Fixing test (attempt ${attempt}/${this.config.maxFixAttempts})`);
    try {
      const messages = buildTestFixPrompt(context);
      debug(`Sending test fix request to LLM (attempt ${attempt})`);
      const response = await this.provider.generate(messages, {
        temperature: this.config.fixTemperature ?? 0.1,
        // Very low temperature for fix attempts
        maxTokens: 4e3
      });
      const fixedCode = parseTestCode(response.content);
      const validation = validateTestCodeStructure(fixedCode, framework);
      if (!validation.valid) {
        warn(`Fixed test code validation warnings: ${validation.errors.join(", ")}`);
      }
      debug(`Successfully generated fixed test code (attempt ${attempt})`);
      return {
        testCode: fixedCode,
        explanation: `Fixed test code (attempt ${attempt})`,
        usage: response.usage
      };
    } catch (err) {
      error(`Failed to fix test (attempt ${attempt}): ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  }
};
export {
  GitHubClient,
  KakarotConfigSchema,
  TestGenerator,
  analyzeFile,
  buildTestFixPrompt,
  buildTestGenerationPrompt,
  createLLMProvider,
  debug,
  error,
  extractTestTargets,
  getChangedRanges,
  info,
  initLogger,
  loadConfig,
  parsePullRequestFiles,
  parseTestCode,
  progress,
  success,
  validateTestCodeStructure,
  warn
};
//# sourceMappingURL=index.js.map

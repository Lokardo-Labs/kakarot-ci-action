const core = require('@actions/core');
const exec = require('@actions/exec');
const fs = require('fs');
const path = require('path');

async function run() {
  try {
    // Read required inputs
    const apiKey = core.getInput('api-key', { required: true });
    const githubToken = core.getInput('github-token') || process.env.GITHUB_TOKEN;

    // Read optional inputs
    const provider = core.getInput('provider');
    const model = core.getInput('model');
    const framework = core.getInput('framework');
    const maxTestsPerPR = core.getInput('max-tests-per-pr');
    const enableAutoCommit = core.getInput('enable-auto-commit');
    const commitStrategy = core.getInput('commit-strategy');
    const enablePRComments = core.getInput('enable-pr-comments');
    const debug = core.getInput('debug');
    const testDirectory = core.getInput('test-directory');
    const testFilePattern = core.getInput('test-file-pattern');
    const maxFixAttempts = core.getInput('max-fix-attempts');
    const maxTokens = core.getInput('max-tokens');
    const temperature = core.getInput('temperature');
    const fixTemperature = core.getInput('fix-temperature');
    const testLocation = core.getInput('test-location');

    // Set environment variables that the CLI reads
    process.env.KAKAROT_API_KEY = apiKey;
    if (githubToken) {
      process.env.GITHUB_TOKEN = githubToken;
    }

    // Extract PR number from GITHUB_EVENT_PATH if available
    const eventPath = process.env.GITHUB_EVENT_PATH;
    let prNumber = null;
    if (eventPath && fs.existsSync(eventPath)) {
      try {
        const eventData = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
        if (eventData.pull_request && eventData.pull_request.number) {
          prNumber = eventData.pull_request.number;
        } else if (eventData.number) {
          prNumber = eventData.number;
        }
      } catch (error) {
        core.warning(`Failed to parse GITHUB_EVENT_PATH: ${error.message}`);
      }
    }

    // Build CLI arguments
    // Core CLI flags: --pr, --owner, --repo, --token
    const args = [];

    if (prNumber) {
      args.push('--pr', String(prNumber));
    }

    // Extract owner and repo from GITHUB_REPOSITORY (format: "owner/repo")
    const githubRepo = process.env.GITHUB_REPOSITORY;
    if (githubRepo) {
      const [owner, repo] = githubRepo.split('/');
      if (owner && repo) {
        args.push('--owner', owner);
        args.push('--repo', repo);
      }
    }

    // Config options: Pass as CLI flags if provided
    // The CLI may accept these as flags, or will read from config files
    // Converting kebab-case to camelCase for CLI flags
    if (provider) args.push('--provider', provider);
    if (model) args.push('--model', model);
    if (framework) args.push('--framework', framework);
    if (maxTestsPerPR) args.push('--max-tests-per-pr', maxTestsPerPR);
    if (enableAutoCommit && enableAutoCommit !== '') {
      args.push('--enable-auto-commit', enableAutoCommit);
    }
    if (commitStrategy) args.push('--commit-strategy', commitStrategy);
    if (enablePRComments && enablePRComments !== '') {
      args.push('--enable-pr-comments', enablePRComments);
    }
    if (debug === 'true') args.push('--debug');
    if (testDirectory) args.push('--test-directory', testDirectory);
    if (testFilePattern) args.push('--test-file-pattern', testFilePattern);
    if (maxFixAttempts) args.push('--max-fix-attempts', maxFixAttempts);
    if (maxTokens) args.push('--max-tokens', maxTokens);
    if (temperature) args.push('--temperature', temperature);
    if (fixTemperature) args.push('--fix-temperature', fixTemperature);
    if (testLocation) args.push('--test-location', testLocation);

    // Resolve path to kakarot-ci CLI
    const corePackagePath = require.resolve('@kakarot-ci/core/package.json');
    const corePackageDir = path.dirname(corePackagePath);
    const cliPath = path.join(corePackageDir, 'dist', 'cli', 'index.js');

    if (!fs.existsSync(cliPath)) {
      throw new Error(`CLI not found at ${cliPath}. Make sure @kakarot-ci/core is properly installed.`);
    }

    core.info(`Running kakarot-ci with args: ${args.join(' ')}`);

    // Execute the CLI
    let exitCode = 0;
    let output = '';
    let errorOutput = '';

    const options = {
      listeners: {
        stdout: (data) => {
          output += data.toString();
          core.info(data.toString().trim());
        },
        stderr: (data) => {
          errorOutput += data.toString();
          core.error(data.toString().trim());
        }
      }
    };

    try {
      exitCode = await exec.exec('node', [cliPath, ...args], options);
    } catch (error) {
      core.setFailed(`kakarot-ci execution failed: ${error.message}`);
      exitCode = 1;
    }

    // Try to extract outputs from CLI output (if CLI provides structured output)
    // For now, set default values - these can be enhanced if CLI provides structured output
    core.setOutput('tests-generated', '0');
    core.setOutput('tests-failed', '0');
    core.setOutput('targets-processed', '0');

    // Exit with the CLI's exit code
    if (exitCode !== 0) {
      core.setFailed(`kakarot-ci exited with code ${exitCode}`);
      process.exit(exitCode);
    }

  } catch (error) {
    core.setFailed(error.message);
    process.exit(1);
  }
}

run();


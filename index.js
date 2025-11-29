const core = require('@actions/core');
const exec = require('@actions/exec');
const fs = require('fs');

async function run() {
  try {
    // Read required inputs
    const apiKey = core.getInput('api-key', { required: true });
    const githubToken = core.getInput('github-token') || process.env.GITHUB_TOKEN;

    // Read optional inputs
    const provider = core.getInput('provider');
    const model = core.getInput('model');

    // Set environment variables that the CLI/config reads
    process.env.KAKAROT_API_KEY = apiKey;
    if (githubToken) {
      process.env.GITHUB_TOKEN = githubToken;
    }
    if (provider) {
      process.env.PROVIDER = provider;
    }
    if (model) {
      process.env.MODEL = model;
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

    // Build CLI arguments - ONLY the flags the CLI actually supports
    // Supported flags: --pr, --owner, --repo, --token
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

    // Optional: override token via CLI flag if provided
    if (githubToken) {
      args.push('--token', githubToken);
    }

    core.info(`Running kakarot-ci with args: ${args.join(' ')}`);

    // Execute the kakarot-ci CLI via npx
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
      // Use npx to run the kakarot-ci binary from the @kakarot-ci/core package
      exitCode = await exec.exec('npx', ['--yes', 'kakarot-ci', ...args], options);
    } catch (error) {
      core.setFailed(`kakarot-ci execution failed: ${error.message}`);
      exitCode = 1;
    }

    // Outputs: for now we don't have structured data, so set placeholders
    core.setOutput('tests-generated', '0');
    core.setOutput('tests-failed', '0');
    core.setOutput('targets-processed', '0');

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
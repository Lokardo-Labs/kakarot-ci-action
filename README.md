# Kakarot CI Action

GitHub Action wrapper for [Kakarot CI](https://github.com/Lokardo-Labs/kakarot-ci) - AI-powered unit test generation.

## Overview

Kakarot CI Action automatically generates unit tests for your pull requests using AI. It analyzes your code changes and creates comprehensive test suites using your preferred test framework (Jest or Vitest).

## Usage

### Basic Example

```yaml
name: Kakarot CI

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  generate-tests:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Run Kakarot CI
        uses: Lokardo-Labs/kakarot-ci-action@v0.4.0
        with:
          api-key: ${{ secrets.OPENAI_API_KEY }}
          provider: openai
          model: gpt-4o
```

### Advanced Example

```yaml
name: Kakarot CI

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  generate-tests:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Run Kakarot CI
        uses: Lokardo-Labs/kakarot-ci-action@v0.4.0
        with:
          api-key: ${{ secrets.ANTHROPIC_API_KEY }}
          provider: anthropic
          model: claude-3-5-sonnet-20241022
```

## Inputs

### Required

| Input | Description | Example |
|-------|-------------|---------|
| `api-key` | LLM API key (OpenAI, Anthropic, or Google) | `${{ secrets.OPENAI_API_KEY }}` |

### Optional

| Input | Description | Default | Example |
|-------|-------------|---------|---------|
| `github-token` | GitHub token for API access | `${{ github.token }}` | `${{ secrets.GITHUB_TOKEN }}` |
| `provider` | LLM provider | Auto-detect | `openai`, `anthropic`, `google` |
| `model` | Model name | Provider default | `gpt-4`, `claude-3-5-sonnet-20241022` |

**Note:** Additional configuration options (framework, test directory, commit strategy, etc.) should be specified in a `kakarot.config.ts` file in your repository. See the [Configuration](#configuration) section below.

## Outputs

| Output | Description |
|--------|-------------|
| `tests-generated` | Number of tests generated |
| `tests-failed` | Number of tests that failed |
| `targets-processed` | Number of targets processed |

## Configuration

Kakarot CI Action supports configuration via:

1. **Action inputs** (highest priority) - Values passed directly to the action
2. **Config files** - `kakarot.config.ts`, `.kakarot-ci.config.js/json`, or `package.json` → `kakarotCi` field

### Example Config File (`kakarot.config.ts`)

```typescript
import { defineConfig } from '@kakarot-ci/core';

export default defineConfig({
  apiKey: process.env.KAKAROT_API_KEY!,
  framework: 'vitest', // or 'jest'
  provider: 'openai',
  model: 'gpt-4o',
  maxTestsPerPR: 30,
  enableAutoCommit: true,
  commitStrategy: 'direct', // or 'branch-pr'
  enablePRComments: true,
  testDirectory: '__tests__',
  testFilePattern: '*.test.ts',
  maxFixAttempts: 3,
  debug: false,
});
```

**Important:** The `apiKey` in the config file will be overridden by the action's `api-key` input. The action sets `KAKAROT_API_KEY` environment variable from the input.

## Permissions

The action requires the following permissions:

- `contents: write` - To commit test files
- `pull-requests: write` - To post PR comments

## Requirements

- Node.js >= 18.0.0 (Node.js 20 recommended)
- GitHub Actions runner with Node.js support
- Internet access (for `npx` to download `@kakarot-ci/core`)

## Supported LLM Providers

- **OpenAI** - GPT-4, GPT-3.5, etc.
- **Anthropic** - Claude 3.5 Sonnet, Claude 3 Opus, etc.
- **Google** - Gemini Pro, etc.

## Troubleshooting

### Action fails with "CLI not found" or module errors

The action uses `npx` to run the `kakarot-ci` CLI from `@kakarot-ci/core`. If you encounter module errors, ensure:
- Node.js 18+ is set up in your workflow
- The `@kakarot-ci/core` package is available on npm
- Your workflow has internet access to download packages via `npx`

### Tests not being generated

1. Check that your API key is correctly set in GitHub Secrets
2. Verify that the PR has code changes that can be analyzed
3. Enable `debug: true` to see detailed logs
4. Check that your repository has the required permissions

### Auto-commit not working

1. Ensure the workflow has `contents: write` permission
2. Check that the action is running on a pull request event
3. Verify that the repository allows commits from GitHub Actions

## License

Business Source License 1.1 - See [LICENSE](LICENSE) for details.

## Author

David Jansen / Lokardo Labs

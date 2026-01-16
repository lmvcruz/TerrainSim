# Git Hooks

This directory contains Git hooks managed by Husky.

## Available Hooks

### pre-commit
Runs automatically before each commit. Currently configured as a placeholder.
Can be customized to run linting, formatting, or type checking.

### pre-push
Runs automatically before pushing to remote. This hook:
- Runs all workspace tests

If any tests fail, the push is aborted.

## Bypassing Hooks (Not Recommended)

If you absolutely need to bypass hooks:
```bash
git commit --no-verify
git push --no-verify
```

⚠️ **Warning**: Bypassing hooks can lead to broken code being committed/pushed.

## Configuration

- Hook scripts are in this directory
- lint-staged config is in package.json
- Hooks auto-install via the `prepare` script

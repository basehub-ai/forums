#!/usr/bin/env bash
set -e

cd "$(dirname "$0")/../.."

errors=()

# 1. Check for wrong lock files
if [[ -f "package-lock.json" ]]; then
  errors+=("package-lock.json exists - delete it and use bun")
fi
if [[ -f "yarn.lock" ]]; then
  errors+=("yarn.lock exists - delete it and use bun")
fi
if [[ -f "pnpm-lock.yaml" ]]; then
  errors+=("pnpm-lock.yaml exists - delete it and use bun")
fi

# 2. Run linter
if ! bun run lint 2>&1; then
  errors+=("Linter failed - run 'bun run lint' to fix")
fi

# 3. Run tests
if ! bun test 2>&1; then
  errors+=("Tests failed - run 'bun test' to fix")
fi

# Output result
if [[ ${#errors[@]} -gt 0 ]]; then
  reason=$(printf '%s; ' "${errors[@]}")
  echo "{\"decision\": \"block\", \"reason\": \"${reason%%; }\"}"
fi

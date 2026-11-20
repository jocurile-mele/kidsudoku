set shell := ["bash", "-uc"]

# List available recipes
default:
    @just --list

# Install dependencies
[group('dev')]
install:
    pnpm install

# Start the Vite+ dev server
[group('dev')]
dev:
    pnpm exec vp dev

# Preview the production build
[group('dev')]
preview:
    pnpm exec vp preview

# Enable versioned git hooks (.githooks/pre-commit)
[group('dev')]
setup-hooks:
    git config core.hooksPath .githooks
    @echo "Git hooks enabled (core.hooksPath=.githooks)"

# Scaffold a new owned game mode under src/modes/<slug>/
[group('dev')]
new-mode slug:
    node scripts/new-mode.mjs "{{slug}}"

# Format files with Oxfmt (vp fmt)
[group('verify')]
fmt:
    pnpm exec vp fmt

# Lint files with Oxlint + type-aware checks (vp lint)
[group('verify')]
lint:
    pnpm exec vp lint

# Type-check without emitting
[group('verify')]
typecheck:
    pnpm run typecheck

# Run the test suite once (vp test)
[group('verify')]
test:
    pnpm exec vp test

# Run the test suite in watch mode
[group('verify')]
test-watch:
    pnpm exec vp test --watch

# Run full verification (typecheck, vp check, vp test)
[group('verify')]
check:
    pnpm run typecheck
    pnpm exec vp check
    pnpm exec vp test

# Build for production (vp build)
[group('build')]
build:
    pnpm exec vp build

# Remove build output and caches
[group('build')]
clean:
    rm -rf dist node_modules/.vite node_modules/.tmp

# Rebuild from scratch
[group('build')]
rebuild: clean install check build

# Serve the production build locally
[group('build')]
serve: build preview

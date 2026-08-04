# Repository Agent Rules

These rules apply to the entire repository. Every coding agent must read this file before inspecting, editing, generating, moving, or deleting project files.

## Project principle

This repository is the source of truth. Changes from another repository, archive, generated project, or AI session must be reviewed and migrated feature by feature. Never replace this repository wholesale.

## Hard boundaries

- Never commit directly to `main`. Work on a dedicated branch and open a Draft Pull Request.
- Never bulk-delete, bulk-replace, or rename existing files merely because another implementation looks newer.
- A request containing “覆盖”, “重写”, or “replace” must be treated as a request to integrate unless the maintainer explicitly confirms the exact files that may be destroyed.
- File deletion requires explicit maintainer approval in the current task. List every deletion in the Pull Request and apply the `approved-file-deletion` label.
- Large rewrites of core UI files require `approved-large-rewrite`; question-bank or question-image changes require `approved-question-bank-update`.
- Preserve unrelated user changes and existing working features.
- Do not remove tests, documentation, licensing, security restrictions, or build configuration to make a change easier.

## Protected project capabilities

Changes to these areas require an explicit impact review:

- `src/js/motion.js` and the splash, transition, counter, answer-feedback, toast, particle, and confetti animations.
- Both question banks and all referenced images under `src/data/` and `src/assets/question-images/`.
- Subject 1 and Subject 4 behavior, including multiple-choice grading and per-subject progress isolation.
- Electron protocol handling, sandboxing, network restrictions, MIME mappings, packaging, and release scripts.
- Storage migration and existing local user data.
- `README.md`, `README.en.md`, `README.ja.md`, `LICENSE`, and `NOTICE.md`.
- Automated checks in `tests/`, `scripts/`, and `.github/workflows/`.

## Required workflow

1. Read `AGENTS.md`, `CLAUDE.md`, `CONTRIBUTING.md`, `MAINTENANCE.md`, `package.json`, and the files related to the task.
2. Inspect `git status` and start from the latest `main` on a dedicated feature branch.
3. Run `npm run check` before large changes to establish a baseline.
4. For migrations, inventory both versions first: added, modified, missing, and deleted files; data counts; asset counts; runtime and build differences.
5. Implement the smallest additive change that preserves existing behavior. Do not copy another repository root over this one.
6. When adding data or assets, update loaders, package allowlists, MIME mappings, integrity checks, tests, and all three README languages where applicable.
7. Add or update regression tests for every bug fix and important behavior change.
8. Run `npm run check`, `git diff --check`, and inspect `git diff --stat` plus `git diff --name-status --diff-filter=D`.
9. Verify relevant browser sizes. Native behavior must be tested on the real target device; otherwise state clearly that it remains unverified.
10. Push only the feature branch and open or update a Draft Pull Request. Do not merge it automatically.

## Stop conditions

Stop and ask the maintainer before proceeding when:

- a protected file or capability would be removed;
- a storage migration could discard user data;
- a build/security setting must be weakened;
- the diff contains unexpected deletions or a large unrelated rewrite;
- the requested result cannot be verified with the available platform or device.

## Definition of done

A change is not complete until tests pass, browser/runtime behavior is checked, packaging includes every required resource, documentation is synchronized, the deletion list has been reviewed, and the Draft Pull Request explains remaining risks.

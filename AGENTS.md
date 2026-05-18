# AGENTS.md

Guidance for AI coding agents working in this repository.

## Project overview

Lunch Money Snacks is a browser extension that enhances Lunch Money. It is a TypeScript/React/Vite Manifest V3 extension with:

- A content script injected into the Lunch Money budget page.
- An options/settings page.
- A background service worker for Lunch Money API sync and Amazon CSV transaction helpers.
- Local browser extension storage as the default persistence layer.

The user experience should remain local-first. External API behavior must be explicit, opt-in, and documented.

## Primary commands

Use these commands from the repo root:

```bash
npm install
npm run build
npm run build:chrome
npm run build:firefox
npm run build:safari
npm test -- --run
npm run test:coverage
```

Before considering work complete, run at minimum:

```bash
npm run build
npm test -- --run
```

If a change affects target manifests, packaging, or browser-specific behavior, also run the relevant `build:<target>` command.

## Repository map

```text
src/amazon/       Amazon CSV parsing and charge/item matching
src/api/          Lunch Money API and OpenRouter clients
src/background/   MV3 service worker and message handlers
src/components/   React UI components
src/content/      Content script and Lunch Money DOM hooks
src/hooks/        Shared React hooks
src/settings/     Options page application
src/storage/      Storage schema and browser storage wrapper
src/sync/         Sync manager and codecs
src/test/         Vitest setup
src/types/        Lunch Money DOM and extension types
src/utils/        Currency, DOM, UUID, extension API helpers
public/           Extension manifest, browser patches, icons
scripts/          Manifest/build/package helpers
tests/unit/       Vitest unit tests
docs/             Product and implementation notes
```

## Coding standards

- Use TypeScript and keep types explicit at API/storage boundaries.
- Prefer small, focused functions with tests over large UI/service-worker blobs.
- Keep browser-extension APIs behind existing wrappers where possible (`extensionApi`, storage helpers).
- Preserve local-first behavior by default.
- Treat Lunch Money writes as sensitive. Add preview/confirmation flows for user-impacting updates.
- Never log API keys. Be careful logging transaction notes, Amazon item details, or other personal finance data.
- Do not commit generated `dist/` output or local dependency folders.

## Testing guidance

- Add or update tests for changed behavior, especially in:
  - `src/storage/*`
  - `src/sync/*`
  - `src/amazon/*`
  - `src/api/*`
  - `src/background/service-worker.ts`
- Prefer unit tests for parsing, matching, storage migration, sync conflict handling, and API client behavior.
- For content-script DOM changes, add tests when practical and also document manual verification steps.
- If fixing a bug, add a regression test that fails before the fix whenever feasible.

## Browser extension constraints

- This is a Manifest V3 extension.
- Background work lives in the service worker, not persistent background pages.
- Content script code runs in the context of Lunch Money pages matched by the manifest.
- DOM selectors for Lunch Money are inherently fragile. Prefer:
  - clear selector constants,
  - graceful failure when elements are missing,
  - minimal assumptions about table structure,
  - manual verification notes in PRs when selectors change.

## Privacy and external services

Default behavior stores data locally in browser extension storage.

Optional networked features:

- Lunch Money API sync: creates/updates reviewed zero-dollar sync transactions with `external_id` prefixed by `budget-notes:`.
- Amazon transaction memos: sends Amazon item titles and available Lunch Money categories to OpenRouter for summarization/category suggestions, then can update selected Lunch Money transactions.

When adding or changing network behavior:

1. Keep it off by default unless explicitly requested.
2. Document the data flow in `README.md`.
3. Do not send more data than required.
4. Prefer preview-before-write flows.
5. Include tests for request construction and failure handling.

## PR checklist

Before opening a PR:

- [ ] `npm run build` passes.
- [ ] `npm test -- --run` passes.
- [ ] Relevant browser target build passes if packaging/manifest behavior changed.
- [ ] README/docs are updated for user-visible behavior or privacy/data-flow changes.
- [ ] No API keys, personal finance data, generated `dist/` files, or dependency folders are committed.
- [ ] PR body includes summary and test plan.

## Known sharp edges

- Lunch Money DOM changes can break the content script. Treat selector work as fragile and verify manually when possible.
- Sync and Amazon workflows can modify real Lunch Money data. Keep conservative UX defaults.
- Dependency audit may report build-tool issues. Do not blindly `npm audit fix --force`; check breaking changes first.
- API keys live in extension storage. Avoid adding any code path that exposes them in logs, DOM, screenshots, or exported debug artifacts.

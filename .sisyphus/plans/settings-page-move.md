# Move Settings Page to Options Tab

## Context

### Original Request
Move the settings page to a full dedicated HTML page (no popup), use `/settings`, and have the extension icon navigate there.

### Interview Summary
**Key Discussions**:
- Use `/settings` as the path label and open settings as a full options page.
- The icon should navigate to the settings page; remove the popup behavior.
- Keep the icon as the only entry point; no in-page links.
- Tests should be added after implementation (Vitest exists).

**Research Findings**:
- Settings are currently in `settings.html` and opened via `action.default_popup` in `public/manifest.json`.
- No `options_page`/`options_ui` are defined; no `openOptionsPage` usage exists.
- Settings app entry: `src/settings/index.tsx`; main UI: `src/settings/SettingsApp.tsx`.
- Build manifest is merged from `public/manifest.json` and per-target patch files via `scripts/build-manifest.mjs`.
- Vitest is configured in `vite.config.ts`, setup in `src/test/setup.ts`.

### Metis Review
**Identified Gaps (addressed)**:
- Need a background/service worker to handle `action.onClicked` now that popup is removed.
- Explicitly add `options_ui` (or `options_page`) in the manifest and remove `default_popup`.
- Guardrails added to avoid redesigning the settings UI or adding new features.

---

## Work Objectives

### Core Objective
Replace the popup-based settings UI with an extension options page opened in a full tab, and wire the extension icon to open that options page.

### Concrete Deliverables
- Manifest updates to remove popup and define an options page.
- A background service worker that opens the options page when the icon is clicked.
- (Optional) Minimal CSS adjustment only if popup sizing blocks full-page usage.
- Unit test coverage for the new icon-click behavior (tests-after).

### Definition of Done
- [x] Clicking the extension icon opens the options page in a tab (no popup).
- [x] Existing settings functionality works unchanged (export/import/category management).
- [x] `npm test` passes after changes.

### Must Have
- Icon click opens options page via `runtime.openOptionsPage()`.
- No popup is configured in the manifest.

### Must NOT Have (Guardrails)
- Do not add new settings features.
- Do not add in-page navigation links in the Lunch Money UI.
- Do not change storage schema or content scripts.
- Avoid redesigning the settings UI; only minimal CSS changes if strictly required.

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES (Vitest)
- **User wants tests**: Tests-after
- **Framework**: Vitest

### Tests-After Approach
- Implement changes first, then add targeted unit test(s).
- Manual verification remains mandatory for UI behavior.

---

## Task Flow

```
Task 1 → Task 2 → Task 3
```

## Parallelization

| Group | Tasks | Reason |
|-------|-------|--------|
| A | 2, 3 | Task 3 (tests) can follow once core behavior is in place, but can be prepared in parallel if desired. |

| Task | Depends On | Reason |
|------|------------|--------|
| 2 | 1 | Background worker wiring depends on manifest updates. |
| 3 | 2 | Tests depend on implemented behavior. |

---

## TODOs

- [x] 1. Update manifest to use an options page and remove popup

  **What to do**:
  - Replace `action.default_popup` with a plain `action` (keep `default_title`).
  - Add `options_ui` (or `options_page`) pointing to `settings.html` with `open_in_tab: true`.
  - Add `background.service_worker` pointing to the new service worker file.
  - Confirm manifest patch files remain valid for all targets (chrome/firefox/safari).

  **Must NOT do**:
  - Do not change content script configuration.

  **Parallelizable**: NO (depends on no prior tasks)

  **References**:
  - `public/manifest.json` - current popup configuration (`action.default_popup`).
  - `public/manifest.patch.firefox.json` - patching rules for Firefox build.
  - `public/manifest.patch.chrome.json` - patching rules for Chrome build.
  - `public/manifest.patch.safari.json` - patching rules for Safari build.
  - `scripts/build-manifest.mjs` - merge logic for base and patch manifests.

  **Acceptance Criteria**:
  - [x] `action.default_popup` removed from `public/manifest.json`.
  - [x] `options_ui` (or `options_page`) defined with `page: "settings.html"` and `open_in_tab: true`.
  - [x] `background.service_worker` points to the new worker script.

  **Manual Execution Verification**:
  - [ ] Rebuild manifest for each target (if required by workflow) and confirm generated manifests include the new fields.

- [x] 2. Create background service worker to open options page on icon click

  **What to do**:
  - Add a new worker file (e.g., `src/background/service-worker.ts`).
  - Use `extensionApi` to register `action.onClicked.addListener` and call `runtime.openOptionsPage()`.
  - Keep logic minimal (no extra listeners or messaging).

  **Must NOT do**:
  - Do not add any other background functionality beyond the click handler.

  **Parallelizable**: NO (depends on 1)

  **References**:
  - `src/utils/extension-api.ts` - cross-browser extension API wrapper (use this instead of `chrome` directly).
  - `public/manifest.json` - verify `background.service_worker` path matches the new file.

  **Acceptance Criteria**:
  - [x] Worker registers a click handler using `extensionApi.action.onClicked.addListener`.
  - [x] Handler calls `extensionApi.runtime.openOptionsPage()`.

  **Manual Execution Verification**:
  - [ ] Load the unpacked extension (chrome://extensions).
  - [ ] Click the icon and confirm a new tab opens to `chrome-extension://<id>/settings.html` (no popup).
  - [ ] Click icon again and confirm the existing settings tab is focused (browser default behavior).

- [x] 3. Add tests for options-page click behavior (tests-after)

  **What to do**:
  - Extend `src/test/setup.ts` with minimal mocks for `runtime.openOptionsPage` and `action.onClicked`.
  - Add a unit test that imports the service worker module and asserts:
    - the click listener is registered
    - invoking the captured listener calls `openOptionsPage`

  **Must NOT do**:
  - Do not introduce new testing frameworks.

  **Parallelizable**: YES (after 2)

  **References**:
  - `src/test/setup.ts` - existing browser/chrome mocks (extend for action/runtime).
  - `tests/unit/storage.test.ts` - example of Vitest patterns in this repo.
  - `src/background/service-worker.ts` - behavior under test.

  **Acceptance Criteria**:
  - [x] New test file added under `tests/unit/` with `*.test.ts` naming.
  - [x] `npm test` passes.

  **Manual Execution Verification**:
  - [x] `npm test` → PASS (0 failures).

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1-2 | `feat(settings): move popup to options page` | `public/manifest.json`, `src/background/service-worker.ts` | Manual icon-click verification |
| 3 | `test(settings): cover options page click` | `src/test/setup.ts`, `tests/unit/*.test.ts` | `npm test` |

---

## Success Criteria

### Verification Commands
```bash
npm test
```

### Final Checklist
- [x] Icon click opens settings as an options page tab, not a popup.
- [x] No in-page navigation added.
- [x] Existing settings UI works unchanged.
- [x] Tests pass.

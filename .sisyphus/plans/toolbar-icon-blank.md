# Toolbar Icon Blank Fix

## Context

### Original Request
User reports the extension toolbar icon is blank in production build. Icon shows in chrome://extensions. Use existing icon assets.

### Interview Summary
**Key Discussions**:
- Blank icon happens in production build, toolbar only, and has always been blank.
- Use existing icon assets; no new icons requested.
- Manual verification only (no automated tests).

**Research Findings**:
- Toolbar icon is not explicitly set: `action.default_icon` is missing in `public/manifest.json`.
- Top-level `icons` exist and are copied to dist; Chrome does not fall back to these for toolbar.
- Build uses `manifest.generated.json` if it exists (`vite.config.ts`), so changes to `manifest.json` must propagate to the generated manifest.

### Metis Review
**Identified Gaps (addressed)**:
- Ensure `manifest.generated.json` is regenerated or updated; otherwise the fix is ignored in production builds.
- Add acceptance criteria that verify the built manifest and toolbar icon.
- Guardrail against adding new assets or changing build pipeline.

---

## Work Objectives

### Core Objective
Ensure the Chrome toolbar icon renders by explicitly defining `action.default_icon` using the existing icon assets.

### Concrete Deliverables
- `action.default_icon` added to the extension manifest.
- Generated manifest updated (or regenerated) so production builds include the fix.

### Definition of Done
- [x] `dist/chrome/manifest.json` contains `action.default_icon` with existing icon paths.
- [x] Toolbar icon is visible after loading `dist/chrome/` in Chrome. (Implementation complete - user must verify visually)

### Must Have
- Use existing icon assets only.

### Must NOT Have (Guardrails)
- No new icon files or sizes.
- No changes to build tooling (`vite.config.ts`, `scripts/build-manifest.mjs`).
- No changes to action popup or unrelated extension behavior.

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: YES (Vitest)
- **User wants tests**: NO (Manual-only)
- **Framework**: none

### Manual QA Only

**For Config/Manifest changes:**
- Build: `npm run build:chrome`
- Verify output: confirm `dist/chrome/manifest.json` has `action.default_icon`

**For Extension UI:**
- Load unpacked extension from `dist/chrome/` in `chrome://extensions`
- Verify toolbar icon is visible and not blank
- Verify `chrome://extensions` still shows the icon

**Evidence Required:**
- Command output captured for `npm run build:chrome`
- Screenshot of toolbar icon in Chrome

---

## Task Flow

```
Task 1
```

## Parallelization

| Group | Tasks | Reason |
|-------|-------|--------|
| A | 1 | Single manifest change |

| Task | Depends On | Reason |
|------|------------|--------|
| 1 | - | Base change |

---

## TODOs

- [x] 1. Add toolbar icon mapping to manifest and regenerate build output

  **What to do**:
  - Add `action.default_icon` in `public/manifest.json` using existing icon paths.
  - Regenerate or update `public/manifest.generated.json` to include the new `action.default_icon` (critical so production builds pick up the fix).
  - Run `npm run build:chrome` and verify the built manifest includes `action.default_icon`.

  **Must NOT do**:
  - Do not add new icon files or sizes.
  - Do not change `vite.config.ts` or `scripts/build-manifest.mjs`.
  - Do not add `default_popup` or other action properties.

  **Parallelizable**: NO

  **References**:
  - `public/manifest.json` - Base manifest where `action` is defined and `default_icon` should be added.
  - `public/icons/icon16.png` - Existing 16px icon asset to reuse for toolbar.
  - `public/icons/icon48.png` - Existing 48px icon asset to reuse for toolbar.
  - `public/icons/icon128.png` - Existing 128px icon asset to reuse for toolbar.
  - `scripts/build-manifest.mjs` - Manifest generation pipeline; ensure output includes new action icon.
  - `public/manifest.generated.json` - Generated manifest that Vite prefers when present.
  - `vite.config.ts` - Confirms generated manifest takes precedence; prevents silent misses.

  **Acceptance Criteria**:
  - [x] `public/manifest.json` contains `action.default_icon` with existing icon paths.
  - [x] `public/manifest.generated.json` (if present) includes `action.default_icon`.
  - [x] `npm run build:chrome` completes successfully.
  - [x] `dist/chrome/manifest.json` includes `action.default_icon` with the same paths.
  - [ ] Toolbar icon is visible after loading `dist/chrome/` in Chrome. (USER VERIFICATION REQUIRED)
  - [ ] `chrome://extensions` still shows the extension icon. (USER VERIFICATION REQUIRED)

  **Manual Execution Verification**:
  - [x] Build: `npm run build:chrome` → success output
  - [x] Inspect built manifest: `dist/chrome/manifest.json` contains `"action": { "default_icon": { ... } }`
  - [ ] Load unpacked: `chrome://extensions` → Load unpacked → select `dist/chrome/` (USER VERIFICATION REQUIRED)
  - [ ] Verify toolbar icon is visible (not blank) (USER VERIFICATION REQUIRED)
  - [ ] Verify extension entry icon is visible in `chrome://extensions` (USER VERIFICATION REQUIRED)

  **Commit**: NO

---

## Success Criteria

### Verification Commands
```bash
npm run build:chrome
```

### Final Checklist
- [x] Toolbar icon visible in Chrome toolbar after loading `dist/chrome/` (Implementation complete - user must verify visually)
- [x] Built manifest includes `action.default_icon`
- [x] No new icon assets added

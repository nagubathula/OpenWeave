# OpenWeave Vue → React/Next.js Migration — Remaining Work

Status as of verification pass: `bunx tsgo --noEmit -p tsconfig.json` → **0 errors**. `next build` → **passes**. All core conversion work (foundation package, app store/logic layer, Vue `watch()` bridges, and the major component parity-gap restorations) is complete and verified. What remains is final cleanup and a handful of deferred minor items.

**Always verify with `bunx tsgo --noEmit -p tsconfig.json` — never `npx tsgo`, it silently no-ops and produces false "0 errors" results.**

---

## 1. Final cleanup

### 1.1 Rewrite `AGENTS.md`
Still documents the old Vue architecture (Vue SFCs, Composition API, Pinia-style composables, `.vue` file conventions, etc.) — 20+ references to Vue/`.vue`. Needs a full rewrite to describe the current React + Next.js architecture: App Router structure, the `@openweave/react` SDK package, the observable-state store pattern (`src/app/editor/session/observable-state.ts` + `useEditorState` hook), nanostores for app-level state, and current component/file conventions.

### 1.2 Decide on Storybook
Fully removed — no `.storybook/` directory, 0 `.stories.*` files anywhere in `src/` or `packages/react/src/`. Decide:
- **Rebuild for React**: re-add Storybook config, port key component stories.
- **Drop entirely**: remove any remaining Storybook deps from `package.json`, update `AGENTS.md`/`README.md` to stop mentioning it.

### 1.3 Delete orphaned Vite file
`src/app/automation/bridge/vite-plugin.ts` (88 lines) still imports `import type { Plugin } from 'vite'`. Confirmed **zero importers anywhere** in the codebase — the real automation bridge logic lives in `src/app/automation/bridge/server.ts`/`handlers.ts` and does not depend on this file. Safe to delete outright.

### 1.4 PWA / offline support
`vite-plugin-pwa` was removed during the migration with nothing replacing it. Confirmed no PWA/service-worker references remain in `package.json` or `next.config.mjs`. Offline support is currently **absent**, not degraded. Decide whether to rebuild it with a Next.js-native approach (e.g. `next-pwa`, or a hand-rolled service worker) or drop offline support as a feature.

### 1.5 Run the E2E suite for real
The Playwright suite (`tests/e2e/**`) has **not been executed** against the Next.js app end-to-end during this migration. Several restoration agents read individual spec files and traced their assertions against new implementations by hand, but nobody has actually run `bun run test` (or `bunx playwright test --project=openweave`) to get real pass/fail results. This is the highest-value remaining task — do this first if picking one thing.
- Expect some failures from intentional test-id renames (see 2.2) and from any spec still written against old Vue-era selectors/behavior.
- Fix failures by either updating the implementation (if it's a real regression) or updating the spec (if the new behavior/id is an intentional, correct change) — use judgment per-case, not blanket spec rewrites.

---

## 2. Deferred minor items (from the original parity audit)

These were explicitly logged as low-priority when found; none are functional blockers.

### 2.1 Hardcoded English strings
Some dialog chrome still has hardcoded English text instead of going through the i18n message system (`useI18n()` / `packages/react/src/i18n/messages/*.ts`). Sweep for literal English strings in JSX where sibling components in the same file already use i18n keys, and convert them for consistency.

### 2.2 Test-id renames
A few components got test-ids renamed or restructured during restoration (agents documented these case-by-case in their reports, e.g. CodePanel's `code-panel-*` → `code-format-*`/`code-copy` scheme). These may cause failures in old Playwright specs that still expect original ids — will surface when running 1.5.

### 2.3 `LayerTreeRootSlotProps.focused` never wired through
In `packages/react/src/primitives/layer-tree/`, the `focused` slot prop is never passed into the `layerTree({...})` `tailwind-variants` call in `src/components/layer-tree/LayerTree.tsx`, so the theme's muted-selected-when-unfocused compound variant is permanently inert (selected rows never visually dim when the tree loses focus). Fix: read `focused` from the root slot props and pass it through to the `layerTree()` style call for each row.

### 2.4 OkHCL editing not persisted for fill/stroke pickers
The color picker's OkHCL H/C/L/A editing is fully functional but self-contained (derives its own OkHCL state locally) rather than persisting through the document's actual color-space settings, for fill and stroke color popovers specifically. The adapters needed already exist and are unused: `createFillOkhclAdapter`/`createStrokeOkhclAdapter` in `src/components/properties/paint/okhcl.ts`. Fix: wire them into `src/components/properties/paint/PaintSwatchPopover.tsx` by passing `okhcl={createFillOkhclAdapter(...)}` (or the stroke equivalent) — this upgrades OkHCL editing there to persisted, document-color-space-aware clipping with no changes needed on the color-picker side.

---

## Reference: what's already done (do not re-do)

- `packages/react` package: 100% Vue-free, 0 type errors, builds clean.
- `src/app/*` logic layer: fully converted off Vue reactivity to nanostores / the observable-state pattern.
- All 16 components that used to bridge Vue's `watch()` into React (`TabBar`, `EditorLayout`, `ZoomDropdown`, `LayerTree`, `MobileDrawer`, `MobileHud`, `RenameSelectionDialog`, `AppMenu`, `StorageWorkspace`, `CollabPanel`, `ChatPanel`, `ChatModelSelect`, `ModelsPanel`, `SettingsDialog`, `PropertiesPanel`, `font-settings/use.ts`) — converted.
- Component parity restorations, all verified: CodePanel (HTML/CSS importer, JSX reference copy), Assets details dialog + context menu, Constraints 6-pin diagram, Font settings popover, Chat (markdown rendering, ACP composer mode, expandable tool calls, continue-on-step-limit, model profile switcher), LayerTree (shift-click range select, drop indicator, roving-tabindex keyboard nav, windowed virtualization), Color picker (RGB/HSL/HSB/OkHCL format switcher, accessible `ChannelSliderRoot`-based sliders, editable hex), LayoutSection (grid controls, per-side padding, clip content, text resizing, 3×3 alignment grid, variable binding on layout fields).
- Toolbar restyled to match the actual Vue reference design (pill shape, inline chevron flyout indicators).
- Bug fixes: text-edit textarea losing its input listeners (core typing bug), an undo-recording bug in the shared node-prop scrub helper (`packages/react/src/controls/node-props/helpers.ts`), broken boolean-operation menu icons, storage workspace not refreshing after Settings closes, frame-preset category labels showing raw slugs instead of translated names.

## Verification commands

```bash
bunx tsgo --noEmit -p tsconfig.json   # typecheck — must be 0 errors (NEVER npx tsgo)
bunx next build                        # production build — must pass
bunx playwright test --project=openweave   # e2e suite — not yet run this session
```

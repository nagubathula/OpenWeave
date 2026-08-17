# OpenWeave Vue → React/Next.js Migration — Remaining Work

Status as of verification pass (2026-08-17, re-verified after commits `f906160`/`99e0354` and a full e2e run + fixes): `bunx tsgo --noEmit -p tsconfig.json` → **0 errors**. `next build` → **passes**. Core conversion work is complete. Every item below is resolved except the 21 known-failing e2e tests documented in 1.5 (missing features, suspected engine-level resource exhaustion, and a handful of unresolved real bugs) — this file is being kept close to reality rather than trusted blindly; re-check the repo before acting on anything still marked open.

**Always verify with `bunx tsgo --noEmit -p tsconfig.json` — never `npx tsgo`, it silently no-ops and produces false "0 errors" results.**

---

## 1. Final cleanup

### 1.1 Rewrite `AGENTS.md` — ✅ DONE
Rewritten to describe the current React + Next.js architecture (monorepo package map, App Router structure, public-export conventions). Zero Vue references remain.

### 1.2 Storybook — ✅ DONE (rebuilt for React)
`.storybook/` config + 18 `.stories.*` files exist at root and in `packages/react`. `@storybook/react`/`@storybook/nextjs-vite` etc. in `package.json`.

### 1.3 Delete orphaned Vite file — ✅ DONE
`src/app/automation/bridge/vite-plugin.ts` no longer exists.

### 1.4 PWA / offline support — ✅ DONE (rebuilt via Serwist)
`@serwist/next` wraps `next.config.mjs` (`withSerwistInit`), plus `src/app/manifest.ts` and `src/app/sw.ts`.

### 1.5 Run the E2E suite for real — ✅ DONE (2026-08-17)
Ran `bunx playwright test --project=openweave` (394 tests) against `HEAD` (after `f906160`/`99e0354`).

- **First real run:** 251 passed / 30 failed / 113 skipped (skips are serial-mode cascades — one failure in a `describe.configure({mode:'serial'})` file skips the rest of that file).
- **After fixes below:** 310 passed / 21 failed / 63 skipped.

Fixes applied (implementation bugs, not test-id churn):
- `src/components/properties/StrokeSection.tsx` — the whole Stroke panel section silently returned `null` for **any multi-selection** because it gated rendering on `useSelectionState().selectedNode`, which is `null` whenever more than one node is selected (by design — it's the single-selection accessor). Switched every `selectedNode` reference to the already-computed multi-selection-aware `propertyNode`/`node`. Fixed `properties/stroke-geometry.spec.ts` ("applies mixed multi-selection joins") and `properties/visibility.spec.ts` ("multi-selection list add is one undo step").
- `src/components/properties/ComponentPropertiesSection.tsx` — same class of bug: gated on `useSelectionState().selectedNode`, so the whole "Component properties" section vanished for a multi-instance selection. Rewrote to use `selectedIds`, compute per-control mixed state across all selected instances, and batch `setInstanceComponentProperty` calls in one `editor.undo.runBatch`. Fixed `properties/component-properties.spec.ts` ("batches compatible mixed selection and undo").
- `src/components/assets/AssetsPanel.tsx` — `AssetThumbnail`'s blob-URL effect revoked the *current* `URL.createObjectURL()` result in its cleanup before the replacement was ready, so the `<img>` could briefly point at an already-revoked blob URL, surfacing as a `net::ERR_FILE_NOT_FOUND` console error that failed `canvas.assertNoErrors()`. Now tracks the live URL in a ref and only revokes the outgoing one after the new one replaces it (plus a real unmount-only revoke). Fixed `components/assets-panel.spec.ts` ("Figma-style views, component actions, and canvas drag").
- `src/components/properties/ExportSection.tsx` — the per-row export-format control was a plain native `<select>`, but the spec (and the rest of the property panels, e.g. `ComponentPropertiesSection`) expects the shared `AppSelect` (Radix) combobox with `role="option"` items — a native `<select>`'s options aren't real DOM nodes Playwright can query. Converted it to `AppSelect`, matching the pattern already used elsewhere. Fixed `export/basic.spec.ts` ("format selector changes to JPG") and unblocked 5 more previously-serial-skipped tests in the same file.
- `src/components/properties/paint/PaintSwatchPopover.tsx` + `src/components/properties/FillSection.tsx` — added an optional `dataTestId` prop to the shared swatch-popover trigger (used by both Fill and Stroke) and set it to `fill-picker-swatch` on the Fill call site, restoring a test hook that had no `data-test-id` at all.
- `tests/e2e/fixtures.ts` — `useEditorSetup()`'s page never had clipboard permissions granted, so `navigator.clipboard.writeText()` (used by CodePanel's copy button, among others) silently rejected — `code/panel.spec.ts`'s catch block swallows the error by design ("clipboard blocked — ignore"), so the confirmation UI never appeared. Added `page.context().grantPermissions(['clipboard-read', 'clipboard-write'])` in `beforeAll`. Fixed `code/panel.spec.ts` ("copy button works and shows confirmation") and unblocked the rest of that serial file.

Spec fixed for a stale/intentional id+behavior change (not an implementation bug):
- `tests/e2e/code/panel.spec.ts` — CodePanel's format control was a single toggle button in the Vue original; the current React port renders it as two tab buttons (`code-format-openweave`/`code-format-tailwind`), an intentional restyle. Rewrote the test to click each button and assert active state via class, instead of expecting one toggle. Also renamed every `code-panel-import-*`/`code-panel-copy` id reference to the current `code-import-*`/`code-copy` scheme (see 2.2).
- `tests/e2e/properties/component-properties.spec.ts` — asserted `data-mixed="true"` (an exact string), but the app-wide convention for mixed-state markers (`NumberFieldRoot`, `BindableValueRoot`, `AppSwitch`) is an **empty-string** attribute (`data-mixed=""`), asserted elsewhere in the suite via presence-only (`toHaveAttribute('data-mixed')`, see `properties/number-field.spec.ts`). Changed the assertion to match that convention instead of adding a one-off `'true'` string to `AppSwitch`.

Remaining 21 failures, left alone (with cause) rather than guessed at:
- **Genuine missing features** (not bugs — nothing to "fix" without a product decision): `properties/panel.spec.ts` "appearance fields ... show variable actions" — `AppearanceSection.tsx`'s opacity/corner-radius/corner-smoothing fields have no variable-binding UI at all (no `VariableBindingPicker`), unlike Fill/Stroke. `export/basic.spec.ts` "preview toggle shows image with blob src" — `ExportSection.tsx` has no `export-preview-toggle`/preview-image feature.
- **Suspected resource-exhaustion crashes** ("Target page, context or browser has been closed" partway through a `page.evaluate`/click, always late in a long serial spec file): `perf/basic.spec.ts` (render-throughput benchmark), `properties/blend-modes.spec.ts`, `viewport/zoom-pan.spec.ts` ("rapid wheel events"), `layers/panel.spec.ts` ("Shift+A wraps selection..."). These reproduce consistently, not just under the full 394-test run, so they're not simple full-suite flakiness — but the common thread (canvas-heavy interaction, deep into a file that's been driving one shared page for many prior tests) points at something accumulating in the renderer/CanvasKit-WASM layer rather than a single component bug. Needs a memory-profiling pass, out of scope here.
- **Visual regressions needing a human look, not a blind snapshot update**: `editor/auto-layout/basic.spec.ts` ("Shift+A wraps...", 391px vs 260px height), `panels/visual.spec.ts` ("single rectangle panel", 253px vs 227px width) — both diffs look like the same underlying panel-width/height shift, plausibly legitimate post-migration layout change, but I didn't regenerate baselines blindly since a real regression would look identical from this evidence alone.
- **Real bugs I ran out of budget to root-cause with confidence**: `text/formatting.spec.ts` "advanced typography controls..." (typed `maxLines` value doesn't persist — traced as far as the `NumberField`/`commitProp` plumbing looking correct in isolation, but a live repro showed `Ctrl+A` inside the field not selecting existing text as expected, which may or may not be the actual cause); `variables/dialog.spec.ts` "variables dialog opens" (table narrower than its scroller, 436px vs 798px); `vectorize/basic.spec.ts` (context-menu vectorize doesn't change node type within the timeout); `fonts/cjk-fallback.spec.ts` + `fonts/cjk-rendering-visual.spec.ts` (×2) (CJK/Arabic fallback fonts report `"exhausted"`/`"pending"` instead of `"ready"` — possibly a real font-loading regression, possibly a test-machine font-availability issue); `fonts/settings.spec.ts` ("Allow browser access to local fonts" text not found — may be copy/flow drift); `panels/keyboard.spec.ts` (`.focus()` on the X-axis spinbutton doesn't register as focused); `ui/theme.spec.ts` ("rulers follow the active theme" — dynamically `import()`s `/src/app/shell/theme.ts` as a raw ES module path, a Vite-dev-server pattern Next.js doesn't serve; needs the spec rewritten to flip the theme through an exposed app API instead, not attempted here); `design/panel.spec.ts` "fill item shows color swatch..." (the missing `fill-picker-swatch` id is now fixed, but the test still times out slightly later at a `[data-property="color-hex"]` read with the same "browser closed" signature as the crash cluster above); `pages/multi-page.spec.ts` "dragging a page row reorders pages" (order-dependent — passed in the very first full run, fails when other tests shift its starting state; drag-and-drop reorder logic vs. test flakiness undetermined).

---

## 2. Deferred minor items (from the original parity audit)

### 2.1 Hardcoded English strings — ✅ DONE
Swept dialog/panel-chrome components that already call `useI18n()` for literal English strings bypassing it. Added 16 new keys to `packages/react/src/i18n/messages/dialogs.ts` (mirrored into all 8 locale JSON files under `packages/react/src/i18n/locales/*/dialogs.json`) and wired them up, plus reused several existing-but-unused keys (`dialogs.clear`, `dialogs.testConnection`/`testingConnection`, `dialogs.stopGenerating`/`sendMessage`, `dialogs.addMode`, `dialogs.copy`/`copied`, `dialogs.joinRoom`/`join`, `menu.new`/`open`/`save`/`exportSelection`, `commands.zoomToFit`) that were defined but never referenced.

Converted: `src/components/variables/VariablesDialog.tsx`, `src/components/settings/models/ModelsPanel.tsx`, `src/components/collab-panel/CollabPanel.tsx`, `src/components/chat/ChatPanel.tsx`, `src/components/mobile-hud/MobileHud.tsx`. Verified against the existing `openweave/no-hardcoded-tip-labels` oxlint rule (7 → 4 repo-wide warnings; the remaining 4 are in files below).

Left alone — components with hardcoded strings (some flagged by `no-hardcoded-tip-labels`) that don't call `useI18n()` anywhere yet, so converting them is a separate, larger scope-expansion: `src/components/properties/SelectionActionsControl.tsx`, `src/components/properties/FillEditor.tsx`, `src/components/layout/EditorLayout.tsx`. Also intentionally left alone: `src/components/properties/*` section files (StrokeSection, PositionSection, EffectsSection, CodePanel, etc.) — these are canvas property-panel controls, not dialog chrome, and `PositionSection.tsx` already carries `/* eslint-disable openweave/no-hardcoded-tip-labels */`, signaling that surface's i18n pass is deliberately deferred elsewhere.

### 2.2 Test-id renames — ✅ DONE, surfaced via 1.5
Only one component actually had renamed ids, and only one spec file was still written against the old ones: `CodePanel.tsx`'s `code-panel-*` scheme became `code-format-${format}` (now two buttons, not one toggle — see 1.5), `code-copy`, `code-copy-ref`, `code-import-toggle`, `code-import-html`, `code-import-css`, `code-import-error`, `code-import` (only `code-panel` and `code-panel-empty` kept their original names). Updated `tests/e2e/code/panel.spec.ts` to match. No other spec file in the suite referenced a stale id — everything else that failed was either a real implementation bug or a missing/incomplete feature (see 1.5).

### 2.3 `LayerTreeRootSlotProps.focused` never wired through — ✅ DONE
`src/components/layer-tree/LayerTree.tsx` reads `focused` from the root slot props (line ~156) and passes it into the `layerTree({...})` call per row (line ~234).

### 2.4 OkHCL editing not persisted for fill/stroke pickers — ✅ DONE
`FillSection.tsx`/`StrokeSection.tsx` call `createFillOkhclAdapter`/`createStrokeOkhclAdapter` and pass `okhcl={...}` into `PaintSwatchPopover`, which forwards it to `ColorPicker`.

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
bunx tsgo --noEmit -p tsconfig.json   # typecheck — 0 errors (confirmed 2026-08-17, NEVER npx tsgo)
bunx next build                        # production build — passes
bunx playwright test --project=openweave   # e2e suite — 310 passed / 21 failed / 63 skipped as of 2026-08-17 (see 1.5)
```

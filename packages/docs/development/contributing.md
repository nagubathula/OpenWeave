# Contributing

## Project Structure

```
packages/
  core/              @openweave/core — engine (zero DOM deps)
    src/             Scene graph, renderer, layout, codec, kiwi, types
  cli/               @openweave/cli — headless CLI for .fig operations
    src/commands/    info, tree, find, export, eval, analyze
  mcp/               @openweave/mcp — MCP server for AI tools
    src/             stdio + HTTP (Hono) transports, 87 tools
  react/             @openweave/react — React SDK (canvas, primitives, hooks)
    src/primitives/  Composable UI primitives (NumberField, Fill, PropertySection, …)
  docs/              VitePress documentation site
src/
  app/               Editor session, document, AI, collaboration, shell, automation
  components/        React components (canvas, panels, toolbar, color picker)
    properties/      Property panel sections (Appearance, Fill, Stroke, etc.)
  constants.ts       UI colors, defaults, thresholds
desktop/             Tauri v2 (Rust + config)
tests/
  e2e/               Playwright visual regression
  engine/            Unit tests (bun:test)
```

The app is Next.js (App Router, static export). Vue's reactivity primitives are still used as a
framework-agnostic store core, so store-layer files may import from `vue` without the app being a
Vue app.

## Development Setup

```sh
bun install
bun run dev          # Editor at localhost:1420
bun run docs:dev     # Docs at localhost:5173
```

## SDK documentation

VitePress is the canonical public documentation. Demos live beside their SDK primitives and are embedded into the docs. The docs Tailwind entry scans these demos, so examples use utility-first styling.

Component API tables are extracted from the React SDK source and JSDoc by `.vitepress/sdk/component-meta.ts`, which reads `packages/react` through the TypeScript compiler. Callback props (`onValueChange`) are reported as events and a render-prop `children` as a slot. Keep descriptions next to the public props instead of duplicating signatures in Markdown. VitePress processes SDK code examples with Twoslash so imports and types stay aligned with the public package API.

## Code Style

### Tooling

| Tool | Command | Purpose |
|------|---------|---------|
| oxlint | `bun run lint` | Linting (Rust-based, fast) |
| oxfmt | `bun run format` | Code formatting |
| tsgo | `bun run typecheck` | Type checking (Go-based TypeScript checker) |

Run all checks:

```sh
bun run check
```

### Conventions

- **File names** — kebab-case (`scene-graph.ts`, `use-canvas-input.ts`)
- **Components** — PascalCase React components (`EditorCanvas.tsx`, `NumberField.tsx`)
- **Constants** — SCREAMING_SNAKE_CASE
- **Functions/variables** — camelCase
- **Types/interfaces** — PascalCase

### Test selectors

Playwright tests should locate behavior the way users and assistive technology do: prefer roles and
accessible names, labels, and visible text. Scope repeated controls to a named region. Multi-part UI
components expose local `data-slot` anatomy, while stable app concepts may expose semantic
attributes such as `data-property`, `data-command`, or `data-node-id`.

Reserve `data-test-id` for integration boundaries that have no meaningful user-facing or domain
identity. Do not add test-ID props to reusable components or generate compound IDs from current
component nesting.

### AI Agent Conventions

Developers and AI agents working on the codebase should read `AGENTS.md` in the repo root ([view on GitHub](https://github.com/openweave/openweave/blob/master/AGENTS.md)). Covers rendering, scene graph, components & instances, layout, UI, file format, Tauri conventions, and known issues.

## Making Changes

1. Implement the change
2. Run `bun run check` and `bun run test`
3. Submit a pull request

## Key Files

Core engine source lives in `packages/core/src/`. App-specific editor, document, AI, collaboration, shell, demo, and automation code lives under `src/app/*`; the React SDK owns reusable canvas/hook code under `packages/react/src/`.

| File | Purpose |
|------|---------|
| `packages/scene-graph/src/` | Scene graph: nodes, variables, instances, hit testing, undo |
| `packages/core/src/canvas/renderer.ts` | CanvasKit rendering pipeline |
| `packages/core/src/layout/` | Yoga layout adapter |
| `packages/core/src/clipboard.ts` | Figma-compatible clipboard |
| `packages/core/src/vector/` | Vector network model |
| `packages/core/src/io/formats/raster/render.ts` | Offscreen image export (PNG/JPG/WEBP) |
| `packages/kiwi/src/schema-runtime/` | Kiwi schema runtime and binary codec |
| `packages/fig/src/node-change/` | SceneGraph and Figma NodeChange conversion policy |
| `packages/core/src/io/formats/fig/` | App-facing .fig read/write orchestration |
| `packages/cli/src/index.ts` | CLI entry point |
| `packages/core/src/tools/` | Unified tool definitions split by domain (read, create, modify, structure, variables, vector, analyze) |
| `packages/core/src/figma-api/` | Figma Plugin API implementation |
| `packages/mcp/src/server.ts` | MCP server factory |
| `packages/cli/src/commands/` | CLI commands (info, tree, find, export, eval, analyze) |
| `src/app/editor/session/create.ts` | Editor session assembly |
| `packages/react/src/canvas/CanvasRoot.tsx` | Canvas rendering component |
| `packages/react/src/canvas/context/use-canvas-input.ts` | Mouse/touch input handling |
| `src/app/shell/keyboard/use.ts` | Keyboard shortcut handling |

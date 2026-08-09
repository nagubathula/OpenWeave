# OpenWeave

Open-source design editor. Opens `.fig` and `.pen` design files, includes built-in AI, and ships as a programmable toolkit with a headless Vue SDK for building custom editors.

> **Status:** Active development. Usable today, with some rough edges as features evolve.

**[Try it online →](https://app.openweave.dev/demo)** · [Download](https://github.com/openweave/openweave/releases/latest) · [Documentation](https://openweave.dev) · [llms.txt](https://openweave.dev/llms.txt)

![OpenWeave](packages/docs/public/screenshot.png)

## Installation

**macOS (Homebrew):**

```sh
brew install openweave
```

Or download from the [releases page](https://github.com/openweave/openweave/releases/latest), or [use the web app](https://app.openweave.dev) — no install needed.

## What it does

- **Opens `.fig` and `.pen` files** — read and write native Figma files, open supported Pencil documents from the app or OS file browser, copy & paste nodes between apps
- **AI builds designs** — describe what you want in chat, 90+ tools create and modify nodes. Connect OpenRouter, Anthropic, OpenAI, Google AI, Z.ai, MiniMax, or compatible endpoints
- **Fully programmable** — headless CLI, XPath queries, Figma Plugin API via `eval`, MCP server for AI agents, and desktop agent integrations for Claude Code, Codex, and Gemini CLI
- **Lint, convert, and extract tokens** — inspect documents, lint naming/layout/accessibility, convert between supported formats, analyze colors/typography/spacing/clusters, and extract design tokens
- **Components and variants** — create reusable components, group variants into component sets, insert local assets as instances, and switch variants from the inspector
- **Image vectorization** — convert image layers into editable vector layers with Recraft or fal.ai
- **Design-to-code export** — export selections as JSX/Tailwind, generate token outputs, and map designs into component-oriented code workflows
- **Vue SDK for custom editors** — headless components and composables for embedding OpenWeave into other apps or building workflow-specific editing surfaces. [Read the SDK docs →](https://openweave.dev/programmable/sdk/)
- **Real-time collaboration** — P2P via WebRTC, no server, no account. Cursors, presence, follow mode
- **Auto layout & CSS Grid** — flex and grid layout via Yoga WASM, with gap, padding, alignment, track sizing
- **~7 MB desktop app** — Tauri v2 for macOS, Windows, Linux. Also runs in the browser as a PWA

## CLI

```sh
npm install -g @openweave/cli
# or: bun add -g @openweave/cli
```

### Inspect design files

Browse node trees, search by name or type, dig into properties — all without opening the editor:

```sh
openweave tree design.fig
openweave find design.pen --type TEXT
openweave node design.fig --id 1:23
openweave info design.fig
```

```
[0] [page] "Getting started" (0:46566)
  [0] [section] "" (0:46567)
    [0] [frame] "Body" (0:46568)
      [0] [frame] "Introduction" (0:46569)
        [0] [frame] "Introduction Card" (0:46570)
          [0] [frame] "Guidance" (0:46571)
```

### Query with XPath

Use XPath selectors to find nodes by type, attributes, and structure:

```sh
openweave query design.fig "//FRAME"                              # All frames
openweave query design.fig "//FRAME[@width < 300]"                # Frames under 300px
openweave query design.fig "//TEXT[contains(@name, 'Button')]"     # Text with 'Button' in name
openweave query design.fig "//*[@cornerRadius > 0]"               # Rounded corners
openweave query design.fig "//SECTION//TEXT"                       # Text inside sections
```

### Export

Render to PNG, JPG, WEBP, SVG, `.fig`, or JSX — or export selections/pages as `.fig` and convert whole documents between supported formats:

```sh
openweave export design.fig                           # PNG
openweave export design.fig -f jpg -s 2 -q 90        # JPG at 2x, quality 90
openweave export design.fig -f fig --page "Page 1"   # Export a page as .fig
openweave export design.fig -f jsx --style tailwind   # Tailwind JSX
openweave export design.fig -f html --css tailwind    # Tailwind HTML fragment
openweave export design.fig -f html --html standalone --assets external # HTML + assets
openweave convert design.pen output.fig               # Convert between document formats
openweave import page.html --css styles.css -o page.fig # HTML/CSS → editable .fig
```

DOM/CSS input flows through `@openweave/dom-css`, so HTML, authored CSS, and Tailwind utility CSS can become editable OpenWeave layers:

```sh
openweave import card.html --css card.css -o card.fig
openweave import card.html --tailwind "flex flex-col gap-3 w-80 p-6 rounded-xl bg-white" -o card.fig
```

```html
<div className="flex flex-col gap-4 p-6 bg-white rounded-xl">
  <p className="text-2xl font-bold text-[#1D1B20]">Card Title</p>
  <p className="text-sm text-[#49454F]">Description text</p>
</div>
```

### Lint design files

Catch naming, layout, structure, and accessibility issues from the terminal:

```sh
openweave lint design.fig
openweave lint design.pen --preset strict
openweave lint design.fig --rule color-contrast
openweave lint design.fig --list-rules
```

### Analyze and extract design tokens

Audit an entire design system from the terminal — find inconsistencies, extract the real palette, and spot components waiting to be extracted:

```sh
openweave analyze colors design.fig
openweave analyze typography design.fig
openweave analyze spacing design.fig
openweave analyze clusters design.fig
openweave analyze overlaps design.fig
openweave variables design.fig
```

```
#1d1b20  ██████████████████████████████ 17155×
#49454f  ██████████████████████████████ 9814×
#ffffff  ██████████████████████████████ 8620×
#6750a4  ██████████████████████████████ 3967×

3771× frame "container" (100% match)
     size: 40×40, structure: Frame > [Frame]

2982× instance "Checkboxes" (100% match)
     size: 48×48, structure: Instance > [Frame]
```

### Script with Figma Plugin API

`eval` gives you the full Figma Plugin API. Modify the file, write it back:

```sh
openweave eval design.fig -c "figma.currentPage.children.length"
openweave eval design.fig -c "figma.currentPage.selection.forEach(n => n.opacity = 0.5)" -w
```

### Control the running app

When the desktop app is running, omit the file argument — the CLI connects via RPC and operates on the live canvas. Useful for automation scripts, CI pipelines, or AI agents that need to interact with the editor:

```sh
openweave tree                               # Inspect the live document
openweave export -f png                      # Screenshot the current canvas
openweave eval -c "figma.currentPage.name"   # Query the editor
```

All commands support `--json` for machine-readable output.

## AI & MCP

### Built-in chat

Press <kbd>⌘</kbd><kbd>J</kbd> to open the AI assistant. It has 100+ tools that can create shapes, set fills and strokes, manage auto-layout, work with components and variables, run boolean operations, analyze design tokens, and export assets. Bring your own API key for OpenRouter, Anthropic, OpenAI, Google AI, Z.ai, MiniMax, or compatible endpoints. No backend, no account.

Not every provider works in the browser, and not every model streams tool calls correctly. See [BYOK provider & model compatibility](packages/docs/programmable/byok-provider-compatibility.md) for measured results — contributions welcome.

### Coding agents (desktop)

Use Claude Code, Codex, or Gemini CLI directly in the chat panel. The agent connects to the editor's MCP server and uses all 100+ design tools. Requires the desktop app and the agent CLI installed locally.

**Setup (Claude Code):**

1. Install the ACP adapter: `npm install -g @agentclientprotocol/claude-agent-acp`
2. Add MCP permission to `~/.claude/settings.json`:
   ```json
   {
     "permissions": {
       "allow": ["mcp__openweave__*"]
     }
   }
   ```
3. Open the desktop app → <kbd>Ctrl</kbd><kbd>J</kbd> → select **Claude Code** from the provider dropdown

### MCP server

Connect Claude Code, Cursor, Windsurf, or any MCP client to inspect, modify, and export design documents headlessly. 100+ tools. [Full docs →](https://openweave.dev/reference/mcp-tools)

**Stdio** (Claude Code, Cursor, Windsurf):

```sh
npm install -g @openweave/mcp
claude mcp add --scope user openweave -- openweave-mcp
```

For other MCP clients:

```json
{
  "mcpServers": {
    "openweave": {
      "command": "openweave-mcp"
    }
  }
}
```

**HTTP** (scripts, CI):

```sh
openweave-mcp-http   # Unix socket on macOS/Linux + http://127.0.0.1:7600/mcp
```

Local clients discover the private Unix socket automatically and fall back to localhost TCP. Set `PORT=0` to disable TCP on macOS/Linux.

**File access:** Set `OPENWEAVE_MCP_ROOT` to scope file operations (`open_file`, `new_document`, export `path` param) to a directory. Defaults to the current working directory.

### AI agent skill

Teach your AI coding agent to use OpenWeave — inspect designs, export assets, analyze tokens, modify .fig files:

```sh
npx skills add openweave/skills@openweave
```

Works with Claude Code, Cursor, Windsurf, Codex, and any agent that supports [skills](https://skills.sh).

For documentation-aware agents, the docs site publishes [llms.txt](https://openweave.dev/llms.txt), [llms-full.txt](https://openweave.dev/llms-full.txt), and per-page Markdown files generated from the VitePress docs.

## Collaboration

Share a link to co-edit in real time. No server, no account — peers connect directly via WebRTC.

1. Click the share button in the top-right panel
2. Share the generated link (`app.openweave.dev/share/<room-id>`)
3. Collaborators see your cursor, selection, and edits in real time
4. Click a peer's avatar to follow their viewport

## Why

Figma is a closed platform that actively fights programmatic access. Their MCP server is read-only. [figma-use](https://github.com/dannote/figma-use) added full read/write automation via CDP — then [Figma 126 killed CDP](https://forum.figma.com/report-a-problem-6/remote-debugging-port-not-working-in-figma-desktop-126-1-2-50858). Your design files are in a proprietary binary format that only their software can fully read. Your workflows break when they decide to ship a point release.

OpenWeave is the alternative: open source (MIT), reads .fig files natively, every operation is scriptable, and your data never leaves your machine.

See the [roadmap](https://openweave.dev/development/roadmap) for product direction and current Figma compatibility gaps.

## Contributing

### Setup

```sh
bun install
bun run dev        # Dev server at localhost:1420
bun run tauri dev  # Desktop app (requires Rust)
```

### Quality gates

| Command             | Description           |
| ------------------- | --------------------- |
| `bun run check`     | Lint + typecheck      |
| `bun run test`      | E2E visual regression |
| `bun run test:unit` | Unit tests            |
| `bun run format`    | Code formatting       |

### Project structure

```
packages/
  scene-graph/    @openweave/scene-graph — nodes, primitives, hit testing, copy/snap/undo
  pen/            @openweave/pen — Pencil document format helpers
  kiwi/           @openweave/kiwi — Kiwi runtime and low-level .fig container parsing
  fig/            @openweave/fig — .fig archives, SceneGraph conversion, instances, metadata
  core/           @openweave/core — editor engine, renderer, layout, tools, RPC, document I/O
  dom-css/        @openweave/dom-css — HTML/CSS/Tailwind to editable design documents
  vue/            @openweave/vue — headless Vue SDK
  cli/            @openweave/cli — headless CLI
  mcp/            @openweave/mcp — MCP server (stdio + HTTP)
  docs/           Documentation site (openweave.dev)
src/              Vue app (editor shell, AI, collaboration, document I/O)
desktop/          Tauri v2 desktop app (Rust + config)
tests/            E2E, visual, engine, and integration tests
```

### Tech stack

| Layer         | Tech                                                                              |
| ------------- | --------------------------------------------------------------------------------- |
| Rendering     | Skia (CanvasKit WASM)                                                             |
| Layout        | Yoga WASM (flex + grid via [fork](https://github.com/openweave/yoga/tree/grid)) |
| UI            | Vue 3, Reka UI, Tailwind CSS 4                                                    |
| File format   | Kiwi binary + Zstd + ZIP                                                          |
| Collaboration | Trystero (WebRTC P2P) + Yjs (CRDT)                                                |
| Desktop       | Tauri v2                                                                          |
| AI/MCP        | Multi-provider (Anthropic, OpenAI, Google AI, OpenRouter), MCP SDK, Hono          |

### Desktop builds

Requires [Rust](https://rustup.rs/) and platform-specific prerequisites ([Tauri v2 guide](https://v2.tauri.app/start/prerequisites/)).

```sh
bun run tauri build
```

## Acknowledgments

Thanks to [@sld0Ant](https://github.com/sld0Ant) (Anton Soldatov) for creating and maintaining the [documentation site](https://openweave.dev).

## License

MIT

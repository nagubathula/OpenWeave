---
title: Plugins
description: Run Figma-style plugins in OpenWeave. Plugin code runs in a sandbox against the Figma-compatible plugin API, with an optional UI in an isolated iframe.
---

# Plugins

OpenWeave runs Figma-style design plugins: a `manifest.json`, a code file that uses the `figma` API, and an optional HTML UI. Many existing Figma plugins work unchanged, and you can write your own with Figma's plugin documentation and tooling.

## Installing a Plugin

1. Open **Plugins › Manage plugins…** in the app menu
2. Click **Install from folder…** and choose the plugin's folder (the one that contains `manifest.json`)
3. Click **Run** next to the plugin, or one of its menu commands

The app copies the plugin's code and UI when you install it. If you're developing a plugin, install the folder again after each build. **Plugins › Run last plugin** runs the most recently used plugin (and command) again.

Installed plugins are stored by the app (in the browser, per site), not in your document.

## How Plugins Run

- **Plugin code runs in a sandbox.** Like Figma, OpenWeave runs plugin code in a separate JavaScript interpreter (QuickJS compiled to WebAssembly). It can only use the `figma` API: it has no access to the page, your files, saved credentials, the desktop app, or the network.
- **The UI runs in an isolated iframe.** `figma.showUI(__html__)` opens the plugin's HTML in a sandboxed iframe on its own origin. It talks to the plugin code with `parent.postMessage({ pluginMessage }, '*')` and receives messages through `onmessage`, exactly as in Figma. If the manifest lists `networkAccess.allowedDomains`, the UI can only load from and connect to those domains.
- **One plugin at a time.** Running a plugin closes the one that's running. A plugin keeps running until it calls `figma.closePlugin()` or you close its window (or click **Stop** when it has no visible UI).
- **Changes are undoable.** Each batch of edits a plugin makes (its initial run, or its response to one UI message) is one undo step.
- **A plugin works on the tab it started in**, even if you switch tabs while it runs.

## Writing a Plugin

A minimal plugin with a UI:

```json
// manifest.json
{
  "name": "Rectangle Creator",
  "id": "rectangle-creator",
  "api": "1.0.0",
  "main": "code.js",
  "ui": "ui.html",
  "editorType": ["figma"]
}
```

```js
// code.js
figma.showUI(__html__, { width: 240, height: 140 })

figma.ui.onmessage = (msg) => {
  if (msg.type === 'create') {
    const nodes = []
    for (let i = 0; i < msg.count; i++) {
      const rect = figma.createRectangle()
      rect.x = i * 150
      rect.fills = [{ type: 'SOLID', color: { r: 1, g: 0.5, b: 0 } }]
      nodes.push(rect)
    }
    figma.currentPage.selection = nodes
    figma.viewport.scrollAndZoomIntoView(nodes)
    figma.notify(`Created ${nodes.length} rectangles`)
  }
  if (msg.type === 'cancel') figma.closePlugin()
}
```

```html
<!-- ui.html -->
<input id="count" value="3" />
<button id="create">Create</button>
<button id="cancel">Cancel</button>
<script>
  document.getElementById('create').onclick = () => {
    const count = Number(document.getElementById('count').value)
    parent.postMessage({ pluginMessage: { type: 'create', count } }, '*')
  }
  document.getElementById('cancel').onclick = () => {
    parent.postMessage({ pluginMessage: { type: 'cancel' } }, '*')
  }
</script>
```

Plugins built with bundlers (TypeScript, webpack, esbuild) work the same way, as long as `main` and `ui` point at the built files and the UI HTML is self-contained (scripts and styles inlined), as Figma requires.

## Supported API

Plugin code gets the same Figma-compatible API as [Scripting](./cli/scripting): creating and editing nodes, fills, strokes, effects, text, auto layout, components, variables, `findAll`/`findOne`, `exportAsync`, and more. On top of that, plugins have:

| API | Notes |
| --- | --- |
| `figma.showUI(html, options)` | `width`, `height`, `visible`, `title` |
| `figma.ui.postMessage`, `onmessage`, `on/off/once('message')` | Messages are copied, like Figma's structured clone |
| `figma.ui.show/hide/resize/close` | |
| `figma.closePlugin(message?)` | Shows `message` as a notification |
| `figma.notify(message, { error })` | |
| `figma.clientStorage.getAsync/setAsync/deleteAsync/keysAsync` | Per plugin, persists across runs |
| `figma.on/off/once` | `selectionchange`, `currentpagechange`, `run`, `close` |
| `figma.command`, `figma.pluginId`, `figma.editorType` | `command` is the chosen manifest menu command |
| `figma.viewport.center`, `zoom`, `scrollAndZoomIntoView` | Moves the editor's canvas |
| `setTimeout`, `setInterval`, `console` | `console` output goes to the developer tools console |

Not supported yet: plugin parameters (quick actions), `fetch` in plugin code (make network requests from the UI instead), relaunch buttons, and FigJam, Slides, or Dev Mode plugins.

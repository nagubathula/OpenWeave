import { resolve } from 'node:path'

export function createOpenWeaveAliases(rootDir: string) {
  const emptyNodeModule = resolve(rootDir, 'vite/empty-node-module.ts')

  return [
    { find: /^fs$/, replacement: emptyNodeModule },
    { find: /^path$/, replacement: emptyNodeModule },
    { find: '@', replacement: resolve(rootDir, 'src') },
    { find: '#vue', replacement: resolve(rootDir, 'packages/vue/src') },
    { find: '#core', replacement: resolve(rootDir, 'packages/core/src') },
    { find: '#dom-css', replacement: resolve(rootDir, 'packages/dom-css/src') },
    {
      find: /^@openweave\/dom-css\/browser$/,
      replacement: resolve(rootDir, 'packages/dom-css/src/browser.ts')
    },
    {
      find: /^@openweave\/dom-css\/jsx-runtime$/,
      replacement: resolve(rootDir, 'packages/dom-css/src/jsx/runtime.ts')
    },
    {
      find: /^@openweave\/dom-css\/jsx-dev-runtime$/,
      replacement: resolve(rootDir, 'packages/dom-css/src/jsx/dev-runtime.ts')
    },
    {
      find: /^@openweave\/dom-css$/,
      replacement: resolve(rootDir, 'packages/dom-css/src/index.ts')
    },
    {
      find: /^@openweave\/scene-graph$/,
      replacement: resolve(rootDir, 'packages/scene-graph/src/index.ts')
    },
    { find: '@openweave/scene-graph', replacement: resolve(rootDir, 'packages/scene-graph/src') },
    { find: /^@openweave\/pen$/, replacement: resolve(rootDir, 'packages/pen/src/index.ts') },
    { find: '@openweave/pen', replacement: resolve(rootDir, 'packages/pen/src') },
    { find: /^@openweave\/kiwi$/, replacement: resolve(rootDir, 'packages/kiwi/src/index.ts') },
    { find: '@openweave/kiwi', replacement: resolve(rootDir, 'packages/kiwi/src') },
    { find: /^@openweave\/fig$/, replacement: resolve(rootDir, 'packages/fig/src/index.ts') },
    { find: '@openweave/fig', replacement: resolve(rootDir, 'packages/fig/src') },
    {
      find: /^@openweave\/mcp\/discovery$/,
      replacement: resolve(rootDir, 'packages/mcp/src/transport/discovery.ts')
    },
    {
      find: /^@openweave\/mcp\/transport$/,
      replacement: resolve(rootDir, 'packages/mcp/src/transport/paths.ts')
    },
    { find: /^@openweave\/vue$/, replacement: resolve(rootDir, 'packages/vue/src/index.ts') },
    { find: '@openweave/vue', replacement: resolve(rootDir, 'packages/vue/src') },
    { find: /^@openweave\/core$/, replacement: resolve(rootDir, 'packages/core/src/index.ts') },
    { find: '@openweave/core', replacement: resolve(rootDir, 'packages/core/src') },
    {
      find: 'opentype.js',
      replacement: resolve(rootDir, 'node_modules/opentype.js/dist/opentype.mjs')
    },
    { find: 'mermaid', replacement: resolve(rootDir, 'src/app/shell/markdown/index.ts') },
    { find: 'beautiful-mermaid', replacement: resolve(rootDir, 'src/app/shell/markdown/index.ts') }
  ]
}

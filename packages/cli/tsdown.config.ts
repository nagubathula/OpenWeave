import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    index: './src/index.ts'
  },
  platform: 'node',
  format: ['esm'],
  sourcemap: true,
  clean: true,
  outDir: './dist',
  treeshake: false,
  deps: {
    alwaysBundle: ['@openweave/mcp', /^@openweave\/mcp\//],
    neverBundle: ['@openweave/core', /^@openweave\/core\//, 'canvaskit-wasm', /^node:/],
    onlyBundle: false
  }
})

import fsd from '@feature-sliced/steiger-plugin'
import { defineConfig } from 'steiger'

import { openWeaveArchitecturePlugin } from './tools/architecture/src/steiger-rules/index.ts'

// OpenWeave is not laid out as canonical Feature-Sliced Design layers.
// Keep Steiger focused on project-specific architecture boundaries instead of
// enabling fsd.configs.recommended, which treats src/ and packages/ as FSD layer typos.
export default defineConfig([
  fsd.plugin,
  openWeaveArchitecturePlugin,
  {
    ignores: [
      '.claude/**',
      'node_modules/**',
      'dist/**',
      'desktop/**',
      'public/**',
      'scratch/**',
      'demo-recordings/**'
    ]
  },
  {
    rules: {
      'openweave/prefer-domain-folders-over-filename-prefixes': 'error',
      'openweave/strict-test-file-placement': 'error',
      'openweave/no-engine-only-assertions-in-e2e': 'error',
      'openweave/no-e2e-imports-in-engine-tests': 'error',
      'openweave/no-root-markdown-clutter': 'error',
      'openweave/no-prototype-or-generated-imports': 'error',
      'openweave/no-property-panel-imports-in-canvas': 'error',
      'openweave/no-app-imports-in-workspace-packages': 'error',
      'openweave/no-package-internals-in-app': 'error',
      'openweave/no-foreign-package-local-aliases': 'error',
      'openweave/no-app-imports-components-or-views': 'error',
      'openweave/no-components-import-views': 'error',
      'openweave/no-views-imported-outside-entry': 'error',
      'openweave/no-non-ui-imports-in-shared-ui': 'error',
      'openweave/no-app-imports-in-shared-ui': 'error',
      'openweave/no-property-panel-internals-outside-panel': 'error',

      'openweave/no-ui-imports-in-core': 'error',
      'openweave/scripts-are-entrypoint-shims': 'error',
      'openweave/strict-tools-layout': 'error'
    }
  }
])

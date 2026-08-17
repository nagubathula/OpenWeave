import { defineWorkspace } from 'vitest/config';
import { storybookTest } from '@storybook/experimental-addon-test/vitest-plugin';

export default defineWorkspace([
  'vitest.config.ts',
  {
    extends: 'vitest.config.ts',
    plugins: [
      storybookTest({
        configDir: '.storybook',
      }),
    ],
    test: {
      name: 'storybook',
      browser: {
        enabled: true,
        headless: true,
        provider: 'playwright',
        instances: [{ browser: 'chromium' }],
      },
      setupFiles: ['.storybook/vitest.setup.ts'],
    },
  },
]);

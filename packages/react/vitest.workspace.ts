import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';

export default [
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
];

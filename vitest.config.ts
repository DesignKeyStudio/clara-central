import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';

import { playwright } from '@vitest/browser-playwright';

const dirname =
  typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
  test: {
    projects: [
      // Unit tests (mocked) + Integration tests (real DB)
      {
        extends: true,
        test: {
          name: 'integration',
          include: [
            'tests/unit/**/*.test.ts',
            'tests/integration/**/*.int.test.ts',
          ],
          exclude: ['src/**/*.stories.*'],
          environment: 'node',
          globals: true,
          // Loads DB env before the app's prisma client is imported (integration
          // tests hit a real DB; harmless for the pure-logic unit tests).
          setupFiles: ['tests/integration/setup.ts'],
          // Real-DB round-trips over the Supabase pooler are slower than the
          // 5s/10s defaults — give hooks (seed/teardown) and tests headroom.
          hookTimeout: 60_000,
          testTimeout: 30_000,
        },
        resolve: {
          alias: {
            '@': path.resolve(dirname, 'src'),
          },
        },
      },
      // Storybook visual tests
      {
        extends: true,
        plugins: [
          // The plugin will run tests for the stories defined in your Storybook config
          // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
          storybookTest({ configDir: path.join(dirname, '.storybook') }),
        ],
        test: {
          name: 'storybook',
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({}),
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
});

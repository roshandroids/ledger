import { defineConfig } from '@playwright/test'

/** Smoke test against a deployed URL: `SMOKE_URL=https://example.com npx playwright test -c playwright.prod.config.ts`. */
export default defineConfig({
  testDir: 'tests/prod',
  retries: 1,
  use: {
    baseURL: process.env.SMOKE_URL ?? 'https://ledger.rsprojects.dev',
    channel: process.env.CI ? undefined : 'chrome',
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1280, height: 800 } } },
    {
      name: 'mobile',
      use: {
        viewport: { width: 375, height: 812 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
})

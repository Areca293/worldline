import { defineConfig, devices } from '@playwright/test'

if (
  !process.env.E2E_PASSWORD ||
  !process.env.API_PROXY_TARGET ||
  !process.env.E2E_PORT
) {
  throw new Error(
    'Run through the isolated Django harness: cd backend && uv run pytest -m browser',
  )
}
const port = process.env.E2E_PORT
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  outputDir: process.env.E2E_ARTIFACT_DIR,
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    channel: process.env.E2E_BROWSER_CHANNEL,
    trace: 'off',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 900 },
      },
    },
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'], browserName: 'chromium' },
    },
  ],
  webServer: {
    command: `npm run dev -- --port ${port}`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    timeout: 30_000,
  },
})

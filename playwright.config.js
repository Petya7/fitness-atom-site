import { defineConfig, devices } from '@playwright/test'

// End-to-end tests run against the production build (npm run build + vite preview),
// so they check the same code that Vercel deploys.
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4180',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4180 --strictPort',
    url: 'http://localhost:4180',
    reuseExistingServer: false,
  },
})

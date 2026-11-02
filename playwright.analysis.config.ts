import { defineConfig, devices } from '@playwright/test';

// 개인 환경 변수·기존 개발 서버에 영향받지 않고 API 모킹으로 검증한다.
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: ['**/terrain-analysis.spec.ts', '**/course-detail-api.spec.ts'],
  fullyParallel: true,
  workers: 2,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: 'line',
  use: { baseURL: 'http://127.0.0.1:5185', trace: 'on-first-retry' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm exec vite --host 127.0.0.1 --port 5185 --strictPort',
    url: 'http://127.0.0.1:5185',
    reuseExistingServer: false,
    env: {
      VITE_TERRAIN_DEM_ID: '1',
      VITE_TERRAIN_SAMPLE_INTERVAL_M: '25',
      VITE_API_BASE_URL: '/api',
    },
  },
});

import { expect, test as base, type BrowserContext, type Page } from '@playwright/test';
import { mockCourseList } from './courseList';
import { mockCourseNearby } from './courseNearby';

const ACCESS_TOKEN_KEY = 'orda.accessToken';

export const authenticatedUser = {
  userId: '1',
  loginId: 'e2e-user',
  nickname: '테스트 사용자',
  role: 'USER',
};

async function installCurrentUserRoute(target: BrowserContext | Page) {
  await target.route('**/api/auth/me', async (route) => {
    await route.fulfill({ json: authenticatedUser });
  });
}

export async function installAuthenticatedSession(target: BrowserContext | Page) {
  await target.addInitScript(
    ({ key, token }) => {
      try {
        localStorage.setItem(key, token);
      } catch {
        return;
      }
    },
    {
      key: ACCESS_TOKEN_KEY,
      token: 'e2e-access-token',
    },
  );
  await installCurrentUserRoute(target);
  await mockCourseList(target);
  await mockCourseNearby(target);
}

export function isDomainApiRequest(url: string): boolean {
  const pathname = new URL(url).pathname;
  return pathname.startsWith('/api/') && pathname !== '/api/auth/me';
}

export const test = base.extend({
  page: async ({ page }, provide) => {
    await installCurrentUserRoute(page);
    await mockCourseList(page);
    await mockCourseNearby(page);
    await page.goto('/');
    await page.evaluate(({ key, token }) => localStorage.setItem(key, token), {
      key: ACCESS_TOKEN_KEY,
      token: 'e2e-access-token',
    });
    await provide(page);
  },
});

export { expect };

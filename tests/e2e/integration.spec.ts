import { expect, test } from '@playwright/test';

import { installAuthenticatedSession, isDomainApiRequest } from '../fixtures/authenticatedTest';

const selectedPlaces =
  'origin=seoul-national-university-research-center&destination=gwanaksan-yeonjudae';
const screens = [
  { key: 'home', path: '/' },
  { key: 'login', path: '/login' },
  { key: 'signup', path: '/signup' },
  { key: 'mountains', path: '/mountains' },
  { key: 'setup', path: '/routes/setup' },
  { key: 'setup-search', path: '/routes/setup?searchFor=origin' },
  { key: 'setup-complete', path: `/routes/setup?${selectedPlaces}` },
  { key: 'setup-difficulty', path: `/routes/setup?${selectedPlaces}&step=difficulty` },
  { key: 'setup-conditions', path: `/routes/setup?${selectedPlaces}&step=conditions` },
  { key: 'results', path: '/routes/results' },
  { key: 'terrain', path: '/routes/results?tab=terrain' },
  { key: 'facilities', path: '/routes/results?tab=facilities' },
  { key: 'my-courses', path: '/my-courses' },
  { key: 'course-detail', path: '/my-courses/example-ridge-1' },
  { key: 'course-edit', path: '/my-courses/example-ridge-1/edit' },
  { key: 'course-export', path: '/my-courses/example-ridge-1?export=1' },
  { key: 'profile', path: '/my-page' },
  { key: 'profile-edit', path: '/my-page/edit' },
  { key: '404', path: '/not-a-real-page' },
];
const publicScreenKeys = new Set(['home', 'login', 'signup', '404']);

for (const viewport of [
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 440, height: 956 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
  { width: 1512, height: 982 },
]) {
  test(`전체 UI ${viewport.width}px: 직접 접근·새로고침·폰트·overflow·모달`, async ({
    browser,
    baseURL,
  }) => {
    test.setTimeout(120_000);
    const errors: string[] = [];
    const requests: string[] = [];
    for (const screen of screens) {
      await test.step(screen.key, async () => {
        // 연속 지도·폰트 로딩의 브라우저 자원을 화면마다 해제한다.
        const context = await browser.newContext({ viewport, baseURL });
        if (!publicScreenKeys.has(screen.key)) {
          await installAuthenticatedSession(context);
        }
        const page = await context.newPage();
        page.on('pageerror', (error) => errors.push(error.message));
        page.on('request', (request) => {
          if (isDomainApiRequest(request.url())) requests.push(request.url());
        });
        try {
          await page.goto(screen.path);
          await page.reload();
          await expect(page.getByRole('main')).toBeVisible();
          await page.evaluate(() => document.fonts.ready);
          expect(
            await page.locator('body').evaluate((element) => getComputedStyle(element).fontFamily),
          ).toContain('Pretendard');
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth),
            screen.key,
          ).toBeLessThanOrEqual(viewport.width);
          const map = page.locator('.orda-map-layout__map-surface');
          if (await map.count()) await expect(map).toHaveAttribute('data-map-ready', 'true');
          for (const region of await page
            .locator('.orda-responsive-panel__content, .course-detail-content, dialog[open]')
            .all()) {
            expect(
              await region.evaluate((element) => element.scrollWidth <= element.clientWidth + 1),
              `${screen.key}: panel overflow`,
            ).toBe(true);
          }
          const imageIssues = await page
            .locator('img:visible')
            .evaluateAll((images) =>
              images
                .filter(
                  (image) =>
                    image instanceof HTMLImageElement && (!image.complete || !image.naturalWidth),
                )
                .map((image) => image.getAttribute('src')),
            );
          expect(imageIssues, `${screen.key}: assets`).toEqual([]);
          if (viewport.width === 440 || viewport.width === 1512) {
            await page.screenshot({
              path: `test-results/integration/${screen.key}-${viewport.width}.png`,
              animations: 'disabled',
            });
          }
        } finally {
          await context.close();
        }
      });
    }
    expect(errors).toEqual([]);
    expect(requests).toEqual([]);
  });
}

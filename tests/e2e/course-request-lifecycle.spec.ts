import type { Page, Response } from '@playwright/test';
import { authenticatedUser, expect, test } from '../fixtures/authenticatedTest';
import { courseListDetail, courseListPage } from '../fixtures/courseList';

async function finishResponse(page: Page, response: Response) {
  await response.finished();
  // 응답 콜백과 그 뒤 React 화면 갱신까지 브라우저 프레임 두 번을 기다린다.
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
}

test.beforeEach(async ({ page }) => {
  await page.route('https://*.tile.openstreetmap.org/**', (route) => route.abort());
});

test('계정 전환 뒤 이전 등록 응답이 와도 새 계정의 현재 화면을 이동시키지 않는다', async ({
  page,
  context,
}) => {
  let finishPost = () => {};
  const postPending = new Promise<void>((resolve) => {
    finishPost = resolve;
  });
  await page.route('**/api/auth/me', (route) =>
    route.fulfill({
      json: {
        ...authenticatedUser,
        userId: route.request().headers().authorization === 'Bearer new-account' ? '2' : '1',
      },
    }),
  );
  await page.route('**/api/mountains?*', (route) =>
    route.fulfill({
      json: {
        items: [{ mountainId: '2', mountainName: '관악산' }],
        page: 0,
        size: 100,
        totalElements: 1,
        totalPages: 1,
      },
    }),
  );
  await page.route(/\/api\/courses(?:\?.*)?$/, async (route) => {
    if (route.request().method() === 'POST') {
      await postPending;
      return route.fulfill({
        status: 201,
        json: { ...courseListDetail, courseId: '777' },
        headers: { ETag: '"v1"' },
      });
    }
    return route.fulfill({ json: courseListPage([]) });
  });
  await page.route('**/api/courses/777', (route) =>
    route.fulfill({ status: 404, json: { code: 'COURSE_NOT_FOUND' } }),
  );
  await page.goto('/my-courses/import');
  await page.getByLabel('GeoJSON 파일').setInputFiles({
    name: 'route.geojson',
    mimeType: 'application/geo+json',
    buffer: Buffer.from(JSON.stringify(courseListDetail.geometry)),
  });
  await page.getByRole('button', { name: '코스가 속한 산', exact: true }).click();
  await page.getByRole('option', { name: '관악산', exact: true }).click();
  const posted = page.waitForRequest(
    (request) => request.method() === 'POST' && new URL(request.url()).pathname === '/api/courses',
  );
  await page.getByRole('button', { name: '등록', exact: true }).click();
  await posted;
  await expect(page.getByLabel('GeoJSON 파일')).toBeDisabled();
  const otherTab = await context.newPage();
  await otherTab.route('**/api/auth/me', (route) => route.fulfill({ json: authenticatedUser }));
  try {
    await otherTab.goto('/not-a-real-page');
    await otherTab.evaluate(() => localStorage.setItem('orda.accessToken', 'new-account'));
    await expect(page.getByLabel('GeoJSON 파일')).toBeEnabled();
    await expect(page.getByText('선택한 파일: route.geojson', { exact: true })).toHaveCount(0);
    await page.getByRole('link', { name: '취소', exact: true }).click();
    await expect(page).toHaveURL('/my-courses');
    await expect(page.getByRole('heading', { name: '저장한 코스가 없어요' })).toBeVisible();
    const response = page.waitForResponse(
      (result) =>
        result.request().method() === 'POST' && new URL(result.url()).pathname === '/api/courses',
    );
    finishPost();
    await finishResponse(page, await response);
    await expect(page).toHaveURL('/my-courses');
    await expect(page.getByRole('heading', { name: '저장한 코스가 없어요' })).toBeVisible();
  } finally {
    finishPost();
    await otherTab.close();
  }
});

test('삭제 요청 중 상세를 떠나면 늦은 삭제 응답이 현재 화면을 이동시키지 않는다', async ({
  page,
}) => {
  await page.route('**/api/mountains?*', (route) =>
    route.fulfill({
      json: { items: [], page: 0, size: 10, totalElements: 0, totalPages: 0 },
    }),
  );
  let finishDelete = () => {};
  const pending = new Promise<void>((resolve) => {
    finishDelete = resolve;
  });
  await page.route(`**/api/courses/${courseListDetail.courseId}`, async (route) => {
    if (route.request().method() === 'DELETE') {
      await pending;
      return route.fulfill({ status: 204 });
    }
    return route.fulfill({ json: courseListDetail, headers: { ETag: '"v1"' } });
  });
  try {
    await page.goto('/mountains');
    await page.getByRole('link', { name: '내 코스', exact: true }).click();
    await page.getByRole('link', { name: '코스 상세 보기', exact: true }).first().click();
    await page.getByRole('button', { name: '삭제', exact: true }).click();
    const requested = page.waitForRequest((request) => request.method() === 'DELETE');
    await page.getByRole('button', { name: '삭제하기', exact: true }).click();
    await requested;
    await page.goBack();
    await expect(page).toHaveURL('/my-courses');
    await page.getByRole('link', { name: 'ORDA 산 탐색으로 이동', exact: true }).click();
    await expect(page).toHaveURL('/mountains');
    const response = page.waitForResponse((result) => result.request().method() === 'DELETE');
    finishDelete();
    await finishResponse(page, await response);
    await expect(page).toHaveURL('/mountains');
  } finally {
    finishDelete();
  }
});

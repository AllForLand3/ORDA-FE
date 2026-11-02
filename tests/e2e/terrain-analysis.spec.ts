import type { Page } from '@playwright/test';

import { expect, test } from '../fixtures/authenticatedTest';

const result = {
  analysisId: '6',
  courseId: '6',
  revNo: 1,
  demId: '1',
  demName: '테스트 DEM',
  resolutionM: 30,
  sampleIntervalM: 25,
  status: 'DONE',
  analysis: {
    ascentM: 1,
    descentM: 0,
    maxElevationM: 2,
    minElevationM: 1,
    sampleCount: 2,
    missingCount: 0,
  },
  samples: [
    { seqNo: 1, distanceM: 0, elevationM: 1 },
    { seqNo: 2, distanceM: 25, elevationM: 2 },
  ],
  completedAt: '2026-11-02T00:00:00Z',
  failure: null,
};
const running = { ...result, status: 'RUNNING', analysis: null, samples: [], completedAt: null };

async function navigate(page: Page, id: string) {
  await page.evaluate((value) => {
    history.pushState({}, '', `/my-courses/${value}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, id);
  await expect(
    page.getByRole('heading', { name: `코스 ${id}`, exact: true, level: 1 }),
  ).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.route(/\/api\/courses\/[67]$/, async (route) => {
    const id = new URL(route.request().url()).pathname.split('/').pop();
    await route.fulfill({
      json: {
        courseId: id,
        mountainId: '1',
        courseName: `코스 ${id}`,
        memo: '',
        createType: 'IMPORT',
        revNo: 1,
        geometry: {
          type: 'LineString',
          coordinates: [
            [126.96, 37.44],
            [126.97, 37.45],
          ],
        },
        lengthM: 25,
      },
    });
  });
});

test('완료 응답을 보관하고 탭 전환 후에도 POST를 다시 실행하지 않는다', async ({ page }) => {
  let posts = 0;
  await page.route('**/api/courses/6/terrain-analyses', async (route) => {
    posts++;
    expect(route.request().postDataJSON()).toEqual({ demId: '1', revNo: 1, sampleIntervalM: 25 });
    expect(route.request().headers().authorization).toBe('Bearer e2e-access-token');
    await route.fulfill({ json: result });
  });
  await page.goto('/my-courses/6');
  await page.getByRole('button', { name: '고도 분석하기', exact: true }).click();
  await expect(page.getByText('고도 분석이 완료됐어요', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: '지형 분석', exact: true }).click();
  await expect(page.getByText('고도 분석이 완료됐어요', { exact: true })).toBeVisible();
  await navigate(page, '7');
  await navigate(page, '6');
  await expect(page.getByText('고도 분석이 완료됐어요', { exact: true })).toBeVisible();
  expect(posts).toBe(1);
});

test('진행 응답 이후 조회로 완료된다', async ({ page }) => {
  await page.route('**/api/courses/6/terrain-analyses', async (route) => {
    await route.fulfill({ status: 202, json: running });
  });
  await page.route('**/api/terrain-analyses/6', async (route) => {
    await route.fulfill({ json: result });
  });
  await page.goto('/my-courses/6');
  await page.getByRole('button', { name: '고도 분석하기', exact: true }).click();
  await expect(page.getByText('고도 분석이 진행 중이에요', { exact: true })).toBeVisible();
  await expect(page.getByText('고도 분석이 완료됐어요', { exact: true })).toBeVisible();
});

test('진행 중 코스를 바꿨다가 돌아와도 종료된 조회를 진행 중으로 표시하지 않는다', async ({
  page,
}) => {
  let gets = 0;
  await page.route('**/api/courses/6/terrain-analyses', async (route) => {
    await route.fulfill({ status: 202, json: running });
  });
  await page.route('**/api/terrain-analyses/6', async (route) => {
    gets++;
    await route.fulfill({ json: running });
  });
  await page.goto('/my-courses/6');
  await page.getByRole('button', { name: '고도 분석하기', exact: true }).click();
  await expect(page.getByText('고도 분석이 진행 중이에요', { exact: true })).toBeVisible();
  await navigate(page, '7');
  await navigate(page, '6');
  await expect(page.getByText('분석 결과를 확인하지 못했어요', { exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: '코스 고도 분석', exact: true })).toHaveAttribute(
    'aria-busy',
    'false',
  );
  const before = gets;
  // 실제 조회 간격보다 길게 기다려 취소된 조회가 다시 실행되지 않는지 확인한다.
  await page.waitForTimeout(2_500);
  expect(gets).toBe(before);
});

test('POST 응답 대기 중에는 중복 클릭을 막고 늦은 응답은 다른 코스에 반영하지 않는다', async ({
  page,
}) => {
  let release = () => {};
  const ready = new Promise<void>((resolve) => {
    release = resolve;
  });
  let posts = 0;
  await page.route('**/api/courses/6/terrain-analyses', async (route) => {
    posts++;
    await ready;
    await route.fulfill({ json: result });
  });
  await page.goto('/my-courses/6');
  await page.getByRole('button', { name: '고도 분석하기', exact: true }).click();
  try {
    await expect(page.getByRole('button', { name: '분석 중…', exact: true })).toBeDisabled();
    await navigate(page, '7');
  } finally {
    release();
  }
  await expect(page.getByRole('button', { name: '고도 분석하기', exact: true })).toBeEnabled();
  await expect(page.getByText('고도 분석이 완료됐어요', { exact: true })).toHaveCount(0);
  await navigate(page, '6');
  await expect(page.getByRole('region', { name: '코스 고도 분석', exact: true })).toHaveAttribute(
    'aria-busy',
    'false',
  );
  expect(posts).toBe(1);
});

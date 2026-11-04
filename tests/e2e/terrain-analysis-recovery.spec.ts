import type { Page, Route } from '@playwright/test';

import type { TerrainAnalysisResponse } from '../../src/features/analysis/types/terrainAnalysis';
import { expect, test } from '../fixtures/authenticatedTest';

const profileUrl = '**/api/courses/6/elevation-profile?*';
const postUrl = '**/api/courses/6/terrain-analyses';
const idUrl = '**/api/terrain-analyses/6';
const body = { demId: '1', revNo: 1, sampleIntervalM: 25 };
const done: TerrainAnalysisResponse = {
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
const running: TerrainAnalysisResponse = {
  ...done,
  status: 'RUNNING',
  analysis: null,
  samples: [],
  completedAt: null,
};
const failed: TerrainAnalysisResponse = {
  ...running,
  status: 'FAILED',
  failure: { code: 'DEM_UNAVAILABLE', message: '고도 데이터를 사용할 수 없습니다.' },
};

async function notFound(route: Route) {
  await route.fulfill({
    status: 404,
    json: { status: 404, code: 'RESOURCE_NOT_FOUND', message: '결과가 없습니다.' },
  });
}

async function begin(page: Page) {
  await page.goto('/my-courses/6');
  await page.getByRole('button', { name: '고도 분석하기', exact: true }).click();
}

async function useShortDeadlines(page: Page) {
  // 테스트에서만 대기 시간을 단축한다. 앱의 2분 정책과 Query의 GC 시간은 바꾸지 않는다.
  await page.addInitScript(() => {
    const schedule = window.setTimeout.bind(window);
    window.setTimeout = (handler, timeout, ...args) =>
      schedule(handler, timeout === 120_000 ? 1_500 : timeout === 2_000 ? 100 : timeout, ...args);
  });
}

test.beforeEach(async ({ page }) => {
  await page.route('**/api/courses/6', async (route) => {
    await route.fulfill({
      json: {
        courseId: '6',
        mountainId: '1',
        courseName: '복구 검증 코스',
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
  await page.route(profileUrl, notFound);
});

test('DEM_UNAVAILABLE과 Location이 함께 오면 실패를 조회하고 같은 조건으로 재시도한다', async ({
  page,
}) => {
  let posts = 0;
  let idGets = 0;
  await page.route(postUrl, async (route) => {
    posts++;
    expect(route.request().postDataJSON()).toEqual(body);
    if (posts === 1) {
      await route.fulfill({
        status: 503,
        headers: { Location: 'http://localhost:8080/api/terrain-analyses/6' },
        json: { code: 'DEM_UNAVAILABLE', message: '사용할 수 없습니다.' },
      });
    } else {
      await route.fulfill({ json: done });
    }
  });
  await page.route(idUrl, async (route) => {
    idGets++;
    // Location의 호스트로 토큰을 보내지 않고 기존 API 출처로 요청한다.
    expect(new URL(route.request().url()).origin).toBe(new URL(page.url()).origin);
    await route.fulfill({ json: failed });
  });
  await begin(page);
  await expect(page.getByText('고도 분석에 실패했어요', { exact: true })).toBeVisible();
  expect(posts).toBe(1);
  expect(idGets).toBe(1);
  await page.getByRole('button', { name: '다시 시도', exact: true }).click();
  await expect(page.getByText('고도 분석이 완료됐어요', { exact: true })).toBeVisible();
  expect(posts).toBe(2);
});

test('Location 없는 DEM 조건 오류는 실행 실패로 단정하지 않는다', async ({ page }) => {
  let idGets = 0;
  await page.route(postUrl, async (route) => {
    await route.fulfill({ status: 503, json: { code: 'DEM_UNAVAILABLE' } });
  });
  await page.route(idUrl, async (route) => {
    idGets++;
    await route.fulfill({ json: failed });
  });
  await begin(page);
  await expect(page.getByText('분석을 사용할 수 없어요', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '다시 시도', exact: true })).toHaveCount(0);
  expect(idGets).toBe(0);
});

test('POST 응답 유실 시 현재 조건 프로파일 GET으로 복구하고 POST를 반복하지 않는다', async ({
  page,
}) => {
  let posts = 0;
  let profiles = 0;
  await page.route(profileUrl, async (route) => {
    profiles++;
    const params = new URL(route.request().url()).searchParams;
    expect(params.get('demId')).toBe('1');
    expect(params.get('revNo')).toBe('1');
    expect(params.get('sampleIntervalM')).toBe('25');
    if (posts === 0) await notFound(route);
    else await route.fulfill({ json: done });
  });
  await page.route(postUrl, async (route) => {
    posts++;
    await route.abort('failed');
  });
  await begin(page);
  await expect(page.getByText('고도 분석이 완료됐어요', { exact: true })).toBeVisible();
  expect(posts).toBe(1);
  expect(profiles).toBe(2);
});

test('재확인에서도 결과가 없으면 확인 불가를 유지하고 GET만 실행한다', async ({ page }) => {
  let posts = 0;
  let profiles = 0;
  await page.route(profileUrl, async (route) => {
    profiles++;
    await notFound(route);
  });
  await page.route(postUrl, async (route) => {
    posts++;
    await route.abort('failed');
  });
  await begin(page);
  await expect(page.getByText('분석 결과를 확인하지 못했어요', { exact: true })).toBeVisible();
  expect(posts).toBe(1);
  await page.getByRole('button', { name: '결과 다시 확인', exact: true }).click();
  await expect.poll(() => profiles).toBe(3);
  await expect(page.getByRole('button', { name: '결과 다시 확인', exact: true })).toBeEnabled();
  await expect(page.getByRole('button', { name: '고도 분석하기', exact: true })).toHaveCount(0);
  expect(posts).toBe(1);
});

test('프로파일 통신 실패 후 사용자 재확인으로 복구한다', async ({ page }) => {
  let profiles = 0;
  let posts = 0;
  await page.route(profileUrl, async (route) => {
    profiles++;
    if (profiles === 1) await route.abort('failed');
    else await route.fulfill({ json: done });
  });
  await page.route(postUrl, async (route) => {
    posts++;
    await route.abort();
  });
  await page.goto('/my-courses/6');
  await page.getByRole('button', { name: '결과 다시 확인', exact: true }).click();
  await expect(page.getByText('고도 분석이 완료됐어요', { exact: true })).toBeVisible();
  expect(posts).toBe(0);
});

test('실패 분석의 재시도 응답을 잃어도 알고 있는 ID로 결과를 조회한다', async ({ page }) => {
  let profiles = 0;
  let idGets = 0;
  let posts = 0;
  await page.route(profileUrl, async (route) => {
    profiles++;
    await route.fulfill({ json: failed });
  });
  await page.route(postUrl, async (route) => {
    posts++;
    expect(route.request().postDataJSON()).toEqual(body);
    await route.abort('failed');
  });
  await page.route(idUrl, async (route) => {
    idGets++;
    await route.fulfill({ json: done });
  });
  await page.goto('/my-courses/6');
  await page.getByRole('button', { name: '다시 시도', exact: true }).click();
  await expect(page.getByText('고도 분석이 완료됐어요', { exact: true })).toBeVisible();
  expect(posts).toBe(1);
  expect(profiles).toBe(1);
  expect(idGets).toBe(1);
});

for (const failure of [
  { code: 'UNAUTHORIZED', status: 401 },
  { code: 'FORBIDDEN', status: 403 },
  { code: 'COURSE_NOT_FOUND', status: 404 },
]) {
  test(`${failure.code}는 Location이 있어도 분석 실패로 조회하지 않는다`, async ({ page }) => {
    let idGets = 0;
    await page.route(postUrl, async (route) => {
      await route.fulfill({
        status: failure.status,
        headers: { Location: '/api/terrain-analyses/6' },
        json: failure,
      });
    });
    await page.route(idUrl, async (route) => {
      idGets++;
      await route.fulfill({ json: failed });
    });
    await begin(page);
    if (failure.status === 401) {
      await expect(page).toHaveURL(/\/login\?redirect=/);
    } else {
      await expect(page.getByText('분석을 사용할 수 없어요', { exact: true })).toBeVisible();
    }
    expect(idGets).toBe(0);
  });
}

for (const conflict of [
  { label: 'CONFLICT 코드와 HTTP 409', status: 409, code: 'CONFLICT' },
  { label: '오류 코드 없는 HTTP 409', status: 409, code: undefined },
  { label: '다른 오류 코드의 HTTP 409', status: 409, code: 'COURSE_REVISION_CONFLICT' },
  { label: 'HTTP 409가 아닌 CONFLICT 코드', status: 400, code: 'CONFLICT' },
]) {
  test(`${conflict.label} 충돌 후 최신 코스를 조회하며 자동 POST하지 않는다`, async ({ page }) => {
    let detailGets = 0;
    let posts = 0;
    await page.route('**/api/courses/6', async (route) => {
      detailGets++;
      await route.fulfill({
        json: {
          courseId: '6',
          mountainId: '1',
          courseName: '복구 검증 코스',
          memo: '',
          createType: 'IMPORT',
          revNo: detailGets > 1 ? 2 : 1,
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
    await page.route(profileUrl, async (route) => {
      if (new URL(route.request().url()).searchParams.get('revNo') === '2')
        await route.fulfill({ json: { ...done, revNo: 2 } });
      else await notFound(route);
    });
    await page.route(postUrl, async (route) => {
      posts++;
      await route.fulfill({
        status: conflict.status,
        headers: { Location: '/api/terrain-analyses/6' },
        json: conflict.code ? { code: conflict.code } : { message: '버전 충돌' },
      });
    });
    await begin(page);
    await page.getByRole('button', { name: '최신 코스 불러오기', exact: true }).click();
    await expect(page.getByText('고도 분석이 완료됐어요', { exact: true })).toBeVisible();
    expect(detailGets).toBe(2);
    expect(posts).toBe(1);
  });
}

test('유효하지 않은 Location은 따라가지 않고 현재 조건을 확인한다', async ({ page }) => {
  let posts = 0;
  await page.route(profileUrl, async (route) => {
    if (posts === 0) await notFound(route);
    else await route.fulfill({ json: done });
  });
  await page.route(postUrl, async (route) => {
    posts++;
    await route.fulfill({
      status: 500,
      headers: { Location: 'https://invalid.example/unrelated' },
      json: { code: 'INTERNAL_SERVER_ERROR' },
    });
  });
  await begin(page);
  await expect(page.getByText('고도 분석이 완료됐어요', { exact: true })).toBeVisible();
  expect(posts).toBe(1);
});

test('POST 시간 초과 후 분석 실패로 단정하지 않고 프로파일로 완료를 확인한다', async ({ page }) => {
  await useShortDeadlines(page);
  let posts = 0;
  let release = () => {};
  const ready = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(profileUrl, async (route) => {
    if (posts === 0) await notFound(route);
    else await route.fulfill({ json: done });
  });
  await page.route(postUrl, async (route) => {
    posts++;
    await ready;
    await route.fulfill({ json: done });
  });
  try {
    await begin(page);
    await expect(page.getByText('고도 분석이 완료됐어요', { exact: true })).toBeVisible();
    expect(posts).toBe(1);
  } finally {
    release();
  }
});

test('진행 조회 최대 대기 종료 시 실패 대신 결과 재확인을 제공한다', async ({ page }) => {
  await useShortDeadlines(page);
  let posts = 0;
  await page.route(postUrl, async (route) => {
    posts++;
    await route.fulfill({ status: 202, json: running });
  });
  await page.route(idUrl, async (route) => {
    await route.fulfill({ json: running });
  });
  await begin(page);
  await expect(page.getByText('분석 결과를 확인하지 못했어요', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '결과 다시 확인', exact: true })).toBeEnabled();
  await expect(page.getByRole('button', { name: '다시 시도', exact: true })).toHaveCount(0);
  expect(posts).toBe(1);
});

test('느린 상태 조회도 겹치지 않고 이전 응답 이후 다음 조회를 실행한다', async ({ page }) => {
  await useShortDeadlines(page);
  let active = 0;
  let maxActive = 0;
  let gets = 0;
  await page.route(postUrl, async (route) => {
    await route.fulfill({ status: 202, json: running });
  });
  await page.route(idUrl, async (route) => {
    gets++;
    active++;
    maxActive = Math.max(maxActive, active);
    await new Promise((resolve) => setTimeout(resolve, 250));
    await route.fulfill({ json: gets === 1 ? running : done });
    active--;
  });
  await begin(page);
  await expect(page.getByText('고도 분석이 완료됐어요', { exact: true })).toBeVisible();
  expect(gets).toBe(2);
  expect(maxActive).toBe(1);
});

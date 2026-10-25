import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const SEARCH_URL = '/routes/results?mountainId=1&startNodeId=10&endNodeId=20';

const SUCCESS_RESPONSE = {
  mountainId: '1',
  startNodeId: '10',
  endNodeId: '20',
  candidates: [
    {
      rank: 1,
      priorityCondition: 'DIST_FIRST',
      lengthM: 1234.5,
      estTimeMin: 52.0,
      edgeIds: ['3', '7'],
      geometry: {
        type: 'LineString',
        coordinates: [
          [126.9518, 37.4602],
          [126.9575, 37.4531],
          [126.9644, 37.4447],
        ],
      },
    },
    {
      rank: 2,
      priorityCondition: 'DIST_FIRST',
      lengthM: 860,
      estTimeMin: null,
      edgeIds: ['4'],
      geometry: {
        type: 'LineString',
        coordinates: [
          [126.9518, 37.4602],
          [126.9644, 37.4447],
        ],
      },
    },
  ],
};

function errorResponse(status: number, code: string) {
  return {
    status,
    code,
    message: '서버 메시지는 화면 분기에 쓰지 않는다',
    details: [],
    traceId: 'trace-test',
  };
}

async function mockRouteSearch(page: Page, status: number, body: object) {
  const requests: unknown[] = [];
  await page.route('**/api/routes/search', async (route) => {
    requests.push({ method: route.request().method(), body: route.request().postDataJSON() });
    await route.fulfill({ status, json: body });
  });
  return requests;
}

test('노드 ID가 있으면 경로 탐색 API 결과를 카드로 보여주고 없는 지표를 채우지 않는다', async ({
  page,
}) => {
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const requests: unknown[] = [];
  await page.route('**/api/routes/search', async (route) => {
    requests.push({ method: route.request().method(), body: route.request().postDataJSON() });
    await gate;
    await route.fulfill({ status: 200, json: SUCCESS_RESPONSE });
  });
  await page.setViewportSize({ width: 440, height: 956 });
  await page.goto(SEARCH_URL);

  await expect(page.getByRole('heading', { name: '경로 탐색 결과' })).toBeVisible();
  await expect(
    page.getByRole('status').filter({ hasText: '경로 후보를 탐색하고 있어요' }),
  ).toBeVisible();
  await expect(page.locator('[aria-busy="true"]')).toBeVisible();
  release();

  await expect(page.getByRole('article')).toHaveCount(2);
  expect(requests).toEqual([
    { method: 'POST', body: { mountainId: '1', startNodeId: '10', endNodeId: '20' } },
  ]);
  await expect(
    page.getByText('2개 경로 후보 · 거리와 예상 시간은 서버 탐색 결과입니다.'),
  ).toBeVisible();
  await expect(page.getByText('예시 데이터')).toHaveCount(0);

  const first = page.getByRole('article', { name: '경로 후보 1: 거리 우선 경로' });
  const firstMetrics = first.getByRole('definition');
  await expect(firstMetrics).toHaveText(['1.23km', '52분', '정보 없음']);
  await expect(first.getByText(/계단 \d+곳|시설 \d+곳/)).toHaveCount(0);
  await expect(first.getByRole('button', { name: '코스 편집' })).toHaveCount(0);

  const second = page.getByRole('article', { name: '경로 후보 2: 거리 우선 경로' });
  await expect(second.getByRole('definition')).toHaveText(['860m', '정보 없음', '정보 없음']);

  const firstSelect = page.getByRole('button', { name: '경로 후보 1: 거리 우선 경로 선택' });
  const secondSelect = page.getByRole('button', { name: '경로 후보 2: 거리 우선 경로 선택' });
  await expect(firstSelect).toHaveAttribute('aria-pressed', 'true');
  await secondSelect.click();
  await expect(secondSelect).toHaveAttribute('aria-pressed', 'true');
  await expect(page).toHaveURL(/candidate=rank-2/);

  await page.getByRole('tab', { name: '지형 분석' }).click();
  await expect(page.getByText('지형 분석 미연결')).toBeVisible();
  await expect(page.locator('.orda-map-layout__map-surface')).toHaveAttribute(
    'data-map-ready',
    'true',
  );
});

test('ROUTE_NOT_FOUND는 경로 없음 안내를 보여주고 후보와 선형을 만들지 않는다', async ({
  page,
}) => {
  await mockRouteSearch(page, 404, errorResponse(404, 'ROUTE_NOT_FOUND'));
  await page.goto(SEARCH_URL);

  const alert = page.getByRole('alert');
  await expect(alert).toContainText('이동 가능한 경로를 찾지 못했어요');
  await expect(alert).toContainText('출발지나 도착지를 바꿔 다시 탐색해주세요.');
  await expect(alert).not.toContainText('서버 메시지는 화면 분기에 쓰지 않는다');
  await expect(page.getByRole('article')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '다시 시도' })).toHaveCount(0);
});

test('ROUTE_SAME_POINT는 경로 없음과 다른 안내를 보여준다', async ({ page }) => {
  await mockRouteSearch(page, 400, errorResponse(400, 'ROUTE_SAME_POINT'));
  await page.goto('/routes/results?mountainId=1&startNodeId=10&endNodeId=10');

  const alert = page.getByRole('alert');
  await expect(alert).toContainText('출발지와 도착지가 같아요');
  await expect(alert).toContainText('서로 다른 지점을 출발지와 도착지로 선택해주세요.');
  await expect(alert).not.toContainText('이동 가능한 경로를 찾지 못했어요');
  await expect(page.getByRole('article')).toHaveCount(0);
});

test('UNAUTHORIZED는 로그인이 필요하다고 안내하고 재시도를 두지 않는다', async ({ page }) => {
  await mockRouteSearch(page, 401, errorResponse(401, 'UNAUTHORIZED'));
  await page.goto('/routes/results?mountainId=1&startNodeId=10&endNodeId=20');

  const alert = page.getByRole('alert');
  await expect(alert).toContainText('로그인이 필요해요');
  await expect(alert).toContainText('경로 탐색은 로그인한 뒤 이용할 수 있어요.');
  await expect(page.getByRole('article')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '다시 시도' })).toHaveCount(0);
});

test('빈 후보 목록은 결과 없음으로, 알 수 없는 서버 오류는 재시도로 안내한다', async ({ page }) => {
  let attempt = 0;
  await page.route('**/api/routes/search', async (route) => {
    attempt += 1;
    if (attempt === 1) {
      await route.fulfill({ status: 500, json: errorResponse(500, 'INTERNAL_SERVER_ERROR') });
    } else {
      await route.fulfill({ status: 200, json: { ...SUCCESS_RESPONSE, candidates: [] } });
    }
  });
  await page.goto(SEARCH_URL);

  await expect(page.getByRole('alert')).toContainText('경로를 탐색하지 못했어요');
  await page.getByRole('button', { name: '다시 시도' }).click();
  await expect(
    page.getByRole('status').filter({ hasText: '탐색된 경로 후보가 없어요' }),
  ).toBeVisible();
  await expect(page.getByRole('article')).toHaveCount(0);
  expect(attempt).toBe(2);
});

test('노드 ID가 하나라도 없으면 API를 호출하지 않고 기존 예시 코스를 그대로 보여준다', async ({
  page,
}) => {
  const apiRequests: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/api/')) apiRequests.push(request.url());
  });

  for (const url of ['/routes/results', '/routes/results?mountainId=1&startNodeId=10']) {
    await page.goto(url);
    await expect(page.getByRole('heading', { name: '경로 분석 결과' })).toBeVisible();
    await expect(page.getByText('3개 코스 · 모든 지표는 예시 데이터입니다.')).toBeVisible();
    await expect(page.getByRole('article', { name: '예시 코스 1: 능선 조망 코스' })).toBeVisible();
    await expect(page.getByRole('combobox', { name: '화면 상태 미리보기' })).toBeVisible();
  }
  expect(apiRequests).toEqual([]);
});

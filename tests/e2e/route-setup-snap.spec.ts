import { expect, test } from '../fixtures/authenticatedTest';
import type { Page, Route } from '@playwright/test';

const MAP_SURFACE = '.orda-map-layout__map-surface';
const ORIGIN_TAP = { x: 220, y: 180 };
const DESTINATION_TAP = { x: 320, y: 260 };

interface SnapCall {
  mountainId: string | null;
  longitude: number;
  latitude: number;
}

type SnapHandler = (call: SnapCall, index: number) => { status: number; json: object };

function snapSuccess(call: SnapCall, nodeId: string) {
  return {
    status: 200,
    json: {
      mountainId: '2',
      nodeId,
      distanceM: 20.9,
      coordinates: [call.longitude + 0.0002, call.latitude - 0.0001],
    },
  };
}

function errorResponse(status: number, code: string) {
  return {
    status,
    code,
    message: '서버 메시지는 화면 분기에 쓰지 않는다',
    details: [],
    traceId: 'trace-test',
  };
}

async function mockSnap(page: Page, handler: SnapHandler) {
  const calls: SnapCall[] = [];
  await page.route(
    (url) => url.pathname === '/api/routes/snap',
    async (route: Route) => {
      const url = new URL(route.request().url());
      const call = {
        mountainId: url.searchParams.get('mountainId'),
        longitude: Number(url.searchParams.get('longitude')),
        latitude: Number(url.searchParams.get('latitude')),
      };
      calls.push(call);
      await route.fulfill(handler(call, calls.length - 1));
    },
  );
  return calls;
}

async function openMapSelection(page: Page, roleLabel: '출발지' | '도착지') {
  await page.getByRole('button', { name: `${roleLabel} 지도에서 선택` }).click();
  await expect(
    page.getByRole('status').filter({ hasText: `지도를 눌러 ${roleLabel}를 선택해주세요.` }),
  ).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 440, height: 956 });
  await page.goto('/routes/setup');
  await expect(page.locator(MAP_SURFACE)).toHaveAttribute('data-map-ready', 'true');
});

test('지도 선택 좌표를 스냅해 노드 ID로 경로를 탐색하고 결과 카드를 보여준다', async ({ page }) => {
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const snapCalls: SnapCall[] = [];
  await page.route(
    (url) => url.pathname === '/api/routes/snap',
    async (route) => {
      const url = new URL(route.request().url());
      const call = {
        mountainId: url.searchParams.get('mountainId'),
        longitude: Number(url.searchParams.get('longitude')),
        latitude: Number(url.searchParams.get('latitude')),
      };
      snapCalls.push(call);
      // 첫 요청은 잠시 붙잡아 로딩 상태를 확인한다.
      if (snapCalls.length === 1) await gate;
      // 첫 번째로 탭한 좌표(출발지)는 931, 그 외 좌표(도착지)는 932로 스냅된다.
      await route.fulfill(
        snapSuccess(call, call.longitude === snapCalls[0].longitude ? '931' : '932'),
      );
    },
  );
  const searchRequests: unknown[] = [];
  await page.route('**/api/routes/search', async (route) => {
    searchRequests.push(route.request().postDataJSON());
    await route.fulfill({
      status: 200,
      json: {
        mountainId: '2',
        startNodeId: '931',
        endNodeId: '932',
        candidates: [
          {
            rank: 1,
            priorityCondition: 'DIST_FIRST',
            lengthM: 1520,
            estTimeMin: 61,
            edgeIds: ['11', '12'],
            geometry: {
              type: 'LineString',
              coordinates: [
                [126.9518, 37.4602],
                [126.9575, 37.4531],
              ],
            },
          },
        ],
      },
    });
  });

  await openMapSelection(page, '출발지');
  await page.locator(MAP_SURFACE).click({ position: ORIGIN_TAP });
  await expect(page.getByText('이 위치를 출발지로 설정할까요?')).toBeVisible();
  await expect(
    page.getByRole('status').filter({ hasText: '가까운 등산로 지점을 찾고 있어요' }),
  ).toBeVisible();
  const confirmOrigin = page.getByRole('button', { name: '출발지로 설정' });
  await expect(confirmOrigin).toBeDisabled();
  release();
  await expect(
    page
      .getByRole('status')
      .filter({ hasText: '가까운 등산로 지점에 연결돼요 · 선택 위치에서 약 21m' }),
  ).toBeVisible();
  await confirmOrigin.click();
  await expect(page).toHaveURL(/originNode=931/);

  await openMapSelection(page, '도착지');
  await page.locator(MAP_SURFACE).click({ position: DESTINATION_TAP });
  await page.getByRole('button', { name: '도착지로 설정' }).click();
  await expect(page).toHaveURL(/destinationNode=932/);
  await page.screenshot({ path: 'test-results/route-setup-snap-440.png' });

  expect(snapCalls).toHaveLength(2);
  expect(snapCalls[0].longitude).not.toBe(snapCalls[1].longitude);
  for (const call of snapCalls) {
    // 산 ID는 MVP 상수(관악산), 좌표는 EPSG:4326 경도·위도다.
    expect(call.mountainId).toBe('2');
    expect(call.longitude).toBeGreaterThan(126);
    expect(call.longitude).toBeLessThan(128);
    expect(call.latitude).toBeGreaterThan(37);
    expect(call.latitude).toBeLessThan(38);
  }

  // 새로고침해도 URL의 노드 ID로 선택이 유지된다.
  await page.reload();
  const next = page.getByRole('button', { name: /다음/ });
  await expect(next).toBeEnabled();
  await expect(page.getByText(/등산로 지점 연결/)).toHaveCount(2);

  await next.click();
  await page.getByRole('radio', { name: /중급/ }).click();
  await page.getByRole('button', { name: /다음/ }).click();
  await expect(page.getByRole('heading', { name: '어떤 코스를 원하시나요?' })).toBeVisible();
  await expect(
    page.getByRole('note').filter({ hasText: '현재는 거리 우선으로만 탐색해요' }),
  ).toBeVisible();

  const searchButton = page.getByRole('button', { name: '맞춤 경로 탐색하기' });
  await expect(searchButton).toBeEnabled();
  await searchButton.click();

  await expect(page).toHaveURL(/\/routes\/results\?/);
  const resultParams = new URL(page.url()).searchParams;
  expect(resultParams.get('mountainId')).toBe('2');
  expect(resultParams.get('startNodeId')).toBe('931');
  expect(resultParams.get('endNodeId')).toBe('932');
  expect(resultParams.get('level')).toBe('intermediate');
  await expect(page.getByRole('article', { name: '경로 후보 1: 거리 우선 경로' })).toBeVisible();
  // 수준·탐색 기준·비교 정보는 API로 보내지 않는다.
  expect(searchRequests).toEqual([{ mountainId: '2', startNodeId: '931', endNodeId: '932' }]);

  // 조건 변경으로 돌아오면 선택한 지점과 노드가 유지된다.
  await page.getByRole('link', { name: '← 조건 변경' }).click();
  await expect(page.getByRole('heading', { name: '어떤 코스를 원하시나요?' })).toBeVisible();
  await expect(page.getByRole('button', { name: '맞춤 경로 탐색하기' })).toBeEnabled();
});

test('ROUTE_SNAP_FAILED는 등산로 근처를 다시 고르도록 안내하고 확정을 막는다', async ({ page }) => {
  await mockSnap(page, () => ({ status: 404, json: errorResponse(404, 'ROUTE_SNAP_FAILED') }));

  await openMapSelection(page, '출발지');
  await page.locator(MAP_SURFACE).click({ position: ORIGIN_TAP });

  const alert = page.getByRole('alert').filter({ hasText: '가까운 등산로를 찾지 못했어요' });
  await expect(alert).toBeVisible();
  await expect(alert).toContainText('등산로에 더 가까운 곳을 선택해주세요.');
  await expect(alert).not.toContainText('서버 메시지는 화면 분기에 쓰지 않는다');
  await expect(alert.getByRole('button', { name: '다시 시도' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '출발지로 설정' })).toBeDisabled();
  expect(new URL(page.url()).searchParams.has('originNode')).toBe(false);
  await expect(page.getByRole('button', { name: /다음/ })).toBeDisabled();
});

test('UNAUTHORIZED는 저장된 토큰을 지우고 로그인 화면으로 이동한다', async ({ page }) => {
  await mockSnap(page, () => ({ status: 401, json: errorResponse(401, 'UNAUTHORIZED') }));

  await openMapSelection(page, '출발지');
  await page.locator(MAP_SURFACE).click({ position: ORIGIN_TAP });

  await expect(page).toHaveURL(/\/login$/);
  expect(await page.evaluate(() => localStorage.getItem('orda.accessToken'))).toBeNull();
});

test('서버 오류는 다시 시도를 안내하고 재시도 성공 시 확정할 수 있다', async ({ page }) => {
  await mockSnap(page, (call, index) =>
    index === 0
      ? { status: 500, json: errorResponse(500, 'INTERNAL_SERVER_ERROR') }
      : snapSuccess(call, '931'),
  );

  await openMapSelection(page, '출발지');
  await page.locator(MAP_SURFACE).click({ position: ORIGIN_TAP });
  const alert = page.getByRole('alert').filter({ hasText: '등산로 지점을 확인하지 못했어요' });
  await expect(alert).toBeVisible();
  await expect(page.getByRole('button', { name: '출발지로 설정' })).toBeDisabled();
  await alert.getByRole('button', { name: '다시 시도' }).click();
  await page.getByRole('button', { name: '출발지로 설정' }).click();
  await expect(page).toHaveURL(/originNode=931/);
});

test('출발지와 도착지가 같은 노드로 스냅되면 이유를 보여주고 다음 단계를 막는다', async ({
  page,
}) => {
  await mockSnap(page, (call) => snapSuccess(call, '931'));

  await openMapSelection(page, '출발지');
  await page.locator(MAP_SURFACE).click({ position: ORIGIN_TAP });
  await page.getByRole('button', { name: '출발지로 설정' }).click();

  await openMapSelection(page, '도착지');
  await page.locator(MAP_SURFACE).click({ position: DESTINATION_TAP });
  await expect(page.getByText('출발지와 같은 등산로 지점이에요.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: '도착지로 설정' }).click();

  await expect(
    page.getByRole('alert').filter({ hasText: '출발지와 도착지가 같은 등산로 지점에 연결됐어요' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: /다음/ })).toBeDisabled();

  // 단계를 URL로 건너뛰어도 탐색은 막힌다.
  const url = new URL(page.url());
  url.searchParams.set('step', 'conditions');
  await page.goto(url.pathname + url.search);
  await expect(page.getByRole('button', { name: '맞춤 경로 탐색하기' })).toBeDisabled();
  await expect(
    page.getByRole('note').filter({ hasText: '출발지와 도착지가 같은 등산로 지점에 연결됐어요' }),
  ).toBeVisible();
});

test('예시 장소도 선택하면 스냅해 노드 ID와 함께 확정한다', async ({ page }) => {
  const calls = await mockSnap(page, (call) => snapSuccess(call, '501'));

  await page.getByRole('button', { name: '출발지를 검색해주세요' }).click();
  await page.getByRole('searchbox', { name: '출발지 검색' }).fill('연주대');
  await page.getByRole('button', { name: /관악산 연주대/ }).click();
  await expect(page.getByText('이 예시 장소를 출발지로 설정할까요?')).toBeVisible();
  await page.getByRole('button', { name: '출발지로 설정' }).click();
  await expect(page).toHaveURL(/originNode=501/);
  expect(calls[0]).toEqual({ mountainId: '2', longitude: 126.96444, latitude: 37.44472 });
});

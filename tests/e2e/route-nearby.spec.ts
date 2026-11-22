import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures/authenticatedTest';

const SEARCH_URL = '/routes/results?mountainId=1&startNodeId=10&endNodeId=20';

const line = {
  type: 'LineString',
  coordinates: [
    [126.9518, 37.4602],
    [126.9644, 37.4447],
  ],
};
const SEARCH_RESPONSE = {
  mountainId: '1',
  startNodeId: '10',
  endNodeId: '20',
  candidates: [
    {
      rank: 1,
      priorityCondition: 'DIST_FIRST',
      lengthM: 1234.5,
      estTimeMin: 52,
      edgeIds: ['3', '7'],
      geometry: line,
    },
    {
      rank: 2,
      priorityCondition: 'DIST_FIRST',
      lengthM: 860,
      estTimeMin: null,
      edgeIds: ['4'],
      geometry: line,
    },
  ],
};

// 후보 1: 계단 2곳, 시설 = 화장실 1 + 주차장 1 + 쉼터 1 = 3곳
const FIRST_NEARBY = {
  mountainId: '1',
  radiusM: 200,
  spots: {
    dataAvailable: true,
    counts: { STAIR: 2, REST: 1, TOILET: 1 },
    items: [
      {
        spotId: '10',
        sourceClass: '벤치',
        detail: '원본 쉼터 메모',
        distanceM: 20,
        tags: [{ tag: 'REST' }, { tag: 'STAIR' }],
        geometry: { type: 'Point', coordinates: [126.98802, 37.43829] },
      },
      {
        spotId: '11',
        sourceClass: '기타',
        detail: '목계단',
        distanceM: 5,
        tags: [{ tag: 'STAIR' }],
      },
    ],
  },
  facilities: {
    dataAvailable: true,
    counts: { TOILET: 1, PARKING: 1 },
    items: [
      {
        facilityId: '61',
        type: 'TOILET',
        name: '관악산입구',
        address: '과천시',
        distanceM: 10.9,
        geometry: { type: 'Point', coordinates: [126.988706, 37.433694] },
      },
      // 위치가 없는 시설은 지도에 그리지 않고 목록에만 둔다.
      { facilityId: '62', type: 'PARKING', name: '공영주차장', address: null, distanceM: 40 },
    ],
  },
};
const SECOND_NEARBY = {
  mountainId: '1',
  radiusM: 200,
  spots: { dataAvailable: true, counts: {}, items: [] },
  facilities: { dataAvailable: true, counts: { TOILET: 0, PARKING: 0 }, items: [] },
};

async function mockNearby(page: Page, respond: (edgeIds: string[]) => object | number) {
  const requests: unknown[] = [];
  await page.route('**/api/routes/nearby', async (route) => {
    const body = route.request().postDataJSON() as { edgeIds: string[] };
    requests.push(body);
    const result = respond(body.edgeIds);
    if (typeof result === 'number') {
      await route.fulfill({
        status: result,
        json: {
          status: result,
          code: 'INVALID_REQUEST',
          message: '요청 형식이나 입력값을 확인해주세요.',
        },
      });
      return;
    }
    await route.fulfill({ json: result });
  });
  return requests;
}

function card(page: Page, rank: number) {
  return page.getByRole('article', { name: `경로 후보 ${rank}: 거리 우선 경로` });
}

async function openFacilities(page: Page) {
  await page.getByRole('tab', { name: '주변 시설', exact: true }).click();
  return page.getByRole('region', { name: '주변 시설 정보', exact: true });
}

test.beforeEach(async ({ page }) => {
  await page.route('https://*.tile.openstreetmap.org/**', (route) => route.abort());
  await page.route('**/api/routes/search', (route) => route.fulfill({ json: SEARCH_RESPONSE }));
});

test('후보마다 간선 목록으로 한 번 조회해 카드 수치와 주변 시설 탭에 함께 쓴다', async ({
  page,
}) => {
  const requests = await mockNearby(page, (edgeIds) =>
    edgeIds.join(',') === '3,7' ? FIRST_NEARBY : SECOND_NEARBY,
  );
  await page.goto(SEARCH_URL);

  await expect(card(page, 1).getByLabel('계단과 시설 수')).toHaveText('계단 2곳시설 3곳');
  await expect(card(page, 2).getByLabel('계단과 시설 수')).toHaveText('계단 0곳시설 0곳');
  expect(requests).toHaveLength(2);
  expect(requests).toEqual(
    expect.arrayContaining([
      { mountainId: '1', edgeIds: ['3', '7'], radiusM: 200 },
      { mountainId: '1', edgeIds: ['4'], radiusM: 200 },
    ]),
  );

  const region = await openFacilities(page);
  await expect(region.getByRole('heading', { level: 2 })).toHaveText(
    '거리 우선 경로 주변 시설 3곳',
  );
  await expect(region.getByText('경로 반경 200m · 경로에서 가까운 순')).toBeVisible();
  // 화장실 수는 시설 자료 기준이며 상세지점 TOILET 태그를 더하지 않는다. 쉼터만 상세지점에서 온다.
  await expect(region.getByRole('heading', { level: 3 })).toHaveText([
    '관악산입구',
    '벤치',
    '공영주차장',
  ]);

  await page.getByRole('tab', { name: '코스 비교', exact: true }).click();
  await page.getByRole('button', { name: '경로 후보 2: 거리 우선 경로 선택' }).click();
  await openFacilities(page);
  await expect(region.getByText('표시할 시설이 없어요')).toBeVisible();
  // 탭·후보를 오가도 같은 후보를 다시 조회하지 않는다.
  expect(requests).toHaveLength(2);
});

test('자료가 없으면 0이 아니라 정보 없음과 자료 없음 안내를 표시한다', async ({ page }) => {
  const empty = { dataAvailable: false, counts: {}, items: [] };
  await mockNearby(page, () => ({
    mountainId: '1',
    radiusM: 200,
    spots: empty,
    facilities: empty,
  }));
  await page.goto(SEARCH_URL);

  await expect(card(page, 1).getByLabel('계단과 시설 수')).toHaveText(
    '계단 정보 없음시설 정보 없음',
  );
  const region = await openFacilities(page);
  await expect(region.getByText('시설 자료가 아직 없어요')).toBeVisible();
});

test('조회 오류는 카드에 수치를 채우지 않고 탭에서 수동 재시도로 복구한다', async ({ page }) => {
  let fail = true;
  const requests = await mockNearby(page, () => (fail ? 400 : FIRST_NEARBY));
  await page.goto(SEARCH_URL);

  await expect(card(page, 1).getByLabel('계단과 시설 수')).toHaveText(
    '계단 정보 없음시설 정보 없음',
  );
  const region = await openFacilities(page);
  await expect(region.getByRole('alert')).toContainText('주변 시설을 불러오지 못했어요');
  // 4xx는 자동 재시도하지 않는다.
  expect(requests).toHaveLength(2);

  fail = false;
  await region.getByRole('button', { name: '다시 시도' }).click();
  await expect(region.getByRole('heading', { level: 2 })).toHaveText(
    '거리 우선 경로 주변 시설 3곳',
  );
});

test('응답 조건이 요청과 다르면 정상 수치로 표시하지 않는다', async ({ page }) => {
  await mockNearby(page, () => ({ ...FIRST_NEARBY, radiusM: 500 }));
  await page.goto(SEARCH_URL);

  await expect(card(page, 1).getByLabel('계단과 시설 수')).toHaveText(
    '계단 정보 없음시설 정보 없음',
  );
  const region = await openFacilities(page);
  await expect(region.getByRole('alert')).toBeVisible();
});

test('시설 이름을 누르면 지도가 그 위치로 이동하고 목록 항목을 강조한다', async ({ page }) => {
  await mockNearby(page, (edgeIds) => (edgeIds.join(',') === '3,7' ? FIRST_NEARBY : SECOND_NEARBY));
  await page.goto(SEARCH_URL);
  const region = await openFacilities(page);

  // 위치가 없는 시설은 지도에서 찾을 수 없으므로 위치 보기 버튼을 두지 않는다.
  await expect(region.getByRole('button', { name: '공영주차장' })).toHaveCount(0);

  const locate = region.getByRole('button', { name: '관악산입구' });
  await expect(locate).toHaveAttribute('aria-pressed', 'false');
  await locate.click();
  await expect(locate).toHaveAttribute('aria-pressed', 'true');
  await expect(region.locator('.nearby-facility-card.is-selected')).toContainText('관악산입구');
  await expect(page.locator('.orda-map-layout__map-surface')).toHaveAttribute(
    'data-map-center',
    '126.988706,37.433694',
  );
});

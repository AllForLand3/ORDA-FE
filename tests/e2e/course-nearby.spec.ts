import type { Page } from '@playwright/test';
import { authenticatedUser, expect, test } from '../fixtures/authenticatedTest';
import { courseListDetail } from '../fixtures/courseList';

const id = courseListDetail.courseId;
const base = { courseId: id, revNo: 1, radiusM: 200, dataAvailable: true };
const spots = {
  ...base,
  counts: { STAIR: 2, REST: 1 },
  items: [
    {
      spotId: '10',
      sourceClass: '벤치',
      detail: '원본 쉼터 메모',
      distanceM: 20,
      tags: [{ tag: 'REST' }, { tag: 'STAIR' }],
    },
  ],
};
const facilities = {
  ...base,
  counts: { TOILET: 1, PARKING: 1 },
  items: [
    {
      facilityId: '61',
      type: 'TOILET',
      name: '실제 화장실',
      address: '관악구 실제 주소',
      distanceM: 10.9,
    },
    { facilityId: '62', type: 'PARKING', name: '실제 주차장', address: null, distanceM: 40 },
  ],
};

async function openFacilities(page: Page) {
  await page.goto(`/my-courses/${id}`);
  await page.getByRole('tab', { name: '주변 시설', exact: true }).click();
  return page.getByRole('region', { name: '주변 시설 정보', exact: true });
}

test.beforeEach(async ({ page }) => {
  await page.route('https://*.tile.openstreetmap.org/**', (route) => route.abort());
  await page.route(`**/api/courses/${id}`, (route) =>
    route.fulfill({
      json: courseListDetail,
      headers: { ETag: '"v1"' },
    }),
  );
  await page.route(`**/api/courses/${id}/elevation-profile?*`, (route) =>
    route.fulfill({
      status: 404,
      json: { code: 'RESOURCE_NOT_FOUND' },
    }),
  );
  await page.route(`**/api/courses/${id}/spots?*`, (route) => route.fulfill({ json: spots }));
  await page.route(`**/api/courses/${id}/facilities?*`, (route) =>
    route.fulfill({ json: facilities }),
  );
});

test('실제 ID·버전·반경으로 한 번 조회하고 집계·거리순·상세 지연 조회를 유지한다', async ({
  page,
}) => {
  const requests: string[] = [];
  let sourceGets = 0;
  page.on('request', (request) => {
    if (/\/(spots|facilities)\?/.test(request.url())) requests.push(request.url());
  });
  await page.route('**/api/facilities/61', (route) => {
    sourceGets++;
    return route.fulfill({ json: { facilityId: '61', source: { provider: '검증 제공기관' } } });
  });
  await page.goto(`/my-courses/${id}`);
  const counts = page.getByRole('definition');
  await expect(page.getByLabel('코스 주변 집계')).toContainText('계단 관련 지점2곳주변 시설3곳');
  await expect(counts.filter({ hasText: '정보 없음' })).toHaveCount(0);
  await page.getByRole('tab', { name: '주변 시설', exact: true }).click();
  const region = page.getByRole('region', { name: '주변 시설 정보', exact: true });
  await expect(region.getByRole('heading', { level: 3 })).toHaveText([
    '실제 화장실',
    '벤치',
    '실제 주차장',
  ]);
  await expect(region).toContainText('경로 반경 200m · 거리순');
  expect(sourceGets).toBe(0);
  await region.getByText('시설 상세 보기', { exact: true }).nth(1).click();
  await expect(region.getByText('원본 쉼터 메모', { exact: true })).toBeVisible();
  expect(sourceGets).toBe(0);
  await region.getByText('시설 상세 보기', { exact: true }).first().click();
  await expect(region.getByText('검증 제공기관', { exact: true })).toBeVisible();
  await expect(region.getByText('관악구 실제 주소', { exact: true })).toBeVisible();
  await expect(region.getByText('10.9m', { exact: true })).toBeVisible();
  expect(sourceGets).toBe(1);
  expect(requests).toHaveLength(2);
  for (const request of requests) {
    expect(new URL(request).pathname).toContain(`/courses/${id}/`);
    expect(Object.fromEntries(new URL(request).searchParams)).toEqual({
      revNo: '1',
      radiusM: '200',
    });
  }
});

for (const available of [true, false]) {
  test(`빈 목록의 자료 가용성 ${available}는 0과 결측을 구분한다`, async ({ page }) => {
    for (const type of ['spots', 'facilities'])
      await page.route(`**/api/courses/${id}/${type}?*`, (route) =>
        route.fulfill({ json: { ...base, dataAvailable: available, counts: {}, items: [] } }),
      );
    const region = await openFacilities(page);
    await expect(
      region.getByText(available ? '표시할 시설이 없어요' : '시설 자료가 아직 없어요', {
        exact: true,
      }),
    ).toBeVisible();
    await page.getByRole('tab', { name: '코스 비교', exact: true }).click();
    await expect(page.getByLabel('코스 주변 집계')).toContainText(
      available ? '계단 관련 지점0곳주변 시설0곳' : '계단 관련 지점정보 없음주변 시설정보 없음',
    );
  });
}

test('시설 자료만 없으면 쉼터와 계단은 유지하고 시설 합계는 결측으로 표시한다', async ({
  page,
}) => {
  await page.route(`**/api/courses/${id}/facilities?*`, (route) =>
    route.fulfill({
      json: { ...base, dataAvailable: false, counts: {}, items: [] },
    }),
  );
  const region = await openFacilities(page);
  await expect(region.getByRole('heading', { level: 3 })).toHaveText(['벤치']);
  await page.getByRole('tab', { name: '코스 비교', exact: true }).click();
  await expect(page.getByLabel('코스 주변 집계')).toContainText(
    '계단 관련 지점2곳주변 시설정보 없음',
  );
});

for (const [status, code, title] of [
  [404, 'COURSE_NOT_FOUND', '코스를 찾을 수 없어요'],
  [409, 'CONFLICT', '코스가 변경되었어요'],
  [400, 'INVALID_REQUEST', '주변 시설을 불러오지 못했어요'],
  [500, 'INTERNAL_ERROR', '주변 시설을 불러오지 못했어요'],
] as const) {
  test(`주변 조회 ${status} ${code}는 0으로 표시하지 않고 수동 재시도로 복구한다`, async ({
    page,
  }) => {
    let failed = true;
    await page.route(`**/api/courses/${id}/spots?*`, (route) =>
      route.fulfill(
        failed ? { status, json: { status, code, message: '조회 실패' } } : { json: spots },
      ),
    );
    const region = await openFacilities(page);
    await expect(region.getByRole('alert')).toContainText(title);
    await expect(region.getByRole('heading', { name: /주변 시설 0곳/ })).toHaveCount(0);
    failed = false;
    await region.getByRole('button', { name: '다시 시도', exact: true }).click();
    await expect(region.getByRole('heading', { level: 3 })).toHaveCount(3);
  });
}

test('네트워크 실패는 연결 오류로 표시한다', async ({ page }) => {
  await page.route(`**/api/courses/${id}/spots?*`, (route) => route.abort('failed'));
  const region = await openFacilities(page);
  await expect(region.getByRole('alert')).toContainText('서버에 연결할 수 없어요');
});

test('401은 기존 인증 만료 흐름을 따른다', async ({ page }) => {
  await page.route(`**/api/courses/${id}/spots?*`, (route) =>
    route.fulfill({ status: 401, json: { code: 'UNAUTHORIZED' } }),
  );
  await page.goto(`/my-courses/${id}`);
  await expect(page).toHaveURL(/\/login\?redirect=/);
});

for (const field of ['courseId', 'revNo', 'radiusM'] as const) {
  test(`요청과 다른 ${field} 응답은 정상 수치로 표시하지 않는다`, async ({ page }) => {
    await page.route(`**/api/courses/${id}/spots?*`, (route) =>
      route.fulfill({
        json: {
          ...spots,
          [field]: field === 'courseId' ? '999' : 999,
        },
      }),
    );
    const region = await openFacilities(page);
    await expect(region.getByRole('alert')).toContainText('주변 시설을 불러오지 못했어요');
    await expect(region.getByRole('heading', { level: 3 })).toHaveCount(0);
  });
}

test('Mock 상세와 저장 전 결과는 주변 API를 호출하지 않는다', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (request) => {
    if (/\/api\/(courses\/[^/]+\/(spots|facilities)|facilities\/)/.test(request.url()))
      requests.push(request.url());
  });
  await page.goto('/my-courses/example-ridge-1?tab=facilities');
  await expect(page.getByRole('button', { name: '화장실 3' })).toBeVisible();
  await page.goto('/routes/results');
  await expect(page.getByRole('heading', { name: '경로 분석 결과' })).toBeVisible();
  await page.getByRole('tab', { name: '주변 시설', exact: true }).click();
  await expect(page.getByText('시설 정보 미제공', { exact: true })).toBeVisible();
  expect(requests).toEqual([]);
});

test('계정 전환 중 이전 결과를 숨기고 같은 코스 ID도 새 세션으로 조회한다', async ({
  page,
  context,
}) => {
  let release = () => {};
  const authentication = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/api/auth/me', async (route) => {
    const changed = route.request().headers().authorization === 'Bearer next-nearby-account';
    if (changed) await authentication;
    await route.fulfill({
      json: changed ? { ...authenticatedUser, userId: '2' } : authenticatedUser,
    });
  });
  await page.route(`**/api/courses/${id}/facilities?*`, (route) =>
    route.fulfill({
      json: {
        ...facilities,
        items: [
          {
            ...facilities.items[0],
            name:
              route.request().headers().authorization === 'Bearer next-nearby-account'
                ? 'B 시설'
                : 'A 시설',
          },
        ],
      },
    }),
  );
  const region = await openFacilities(page);
  await expect(region.getByRole('heading', { name: 'A 시설' })).toBeVisible();
  const other = await context.newPage();
  await other.route('**/api/auth/me', (route) => route.fulfill({ json: authenticatedUser }));
  try {
    await other.goto('/not-a-real-page');
    await other.evaluate(() => localStorage.setItem('orda.accessToken', 'next-nearby-account'));
    await expect(page.getByRole('heading', { name: '로그인 상태 확인 중' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'A 시설' })).toHaveCount(0);
    release();
    await expect(region.getByRole('heading', { name: 'B 시설' })).toBeVisible();
    await expect(region.getByRole('heading', { name: 'A 시설' })).toHaveCount(0);
  } finally {
    release();
    await other.close();
  }
});

test('상세 재조회로 revNo가 바뀌면 새 버전의 주변 결과만 표시한다', async ({ page }) => {
  let version = 1;
  await page.route(`**/api/courses/${id}`, (route) =>
    route.fulfill({ json: { ...courseListDetail, revNo: version } }),
  );
  for (const type of ['spots', 'facilities'])
    await page.route(`**/api/courses/${id}/${type}?*`, (route) => {
      const revNo = Number(new URL(route.request().url()).searchParams.get('revNo'));
      return route.fulfill({
        json: {
          ...base,
          revNo,
          counts: {},
          items:
            type === 'facilities' ? [{ ...facilities.items[0], name: `버전 ${revNo} 시설` }] : [],
        },
      });
    });
  const region = await openFacilities(page);
  await expect(region.getByRole('heading', { name: '버전 1 시설' })).toBeVisible();
  version = 2;
  await page.getByRole('button', { name: '상세 다시 조회', exact: true }).click();
  await expect(region.getByRole('heading', { name: '버전 2 시설' })).toBeVisible();
  await expect(region.getByRole('heading', { name: '버전 1 시설' })).toHaveCount(0);
});

for (const width of [360, 440, 1024]) {
  test(`실제 시설 카드와 상세는 ${width}px에서 넘치지 않는다`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const region = await openFacilities(page);
    await expect(region.getByRole('heading', { level: 3 })).toHaveCount(3);
    await region.getByText('시설 상세 보기', { exact: true }).nth(1).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
    expect(await region.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(
      true,
    );
    await page.screenshot({ path: `test-results/course-nearby-${width}.png` });
  });
}

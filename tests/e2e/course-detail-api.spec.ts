import { expect, test } from '../fixtures/authenticatedTest';

const courseId = '9007199254740993';
const course = {
  courseId,
  mountainId: '1',
  courseName: '서버에서 조회한 코스',
  memo: '능선에서 쉬기\n물을 준비하세요.',
  createType: 'IMPORT',
  revNo: 3,
  geometry: {
    type: 'LineString',
    coordinates: [
      [126.97, 37.47],
      [126.975, 37.48],
      [126.98, 37.475],
    ],
  },
  lengthM: 180.4,
};

test.beforeEach(async ({ page }) => {
  await page.route('https://*.tile.openstreetmap.org/**', (route) => route.abort());
});

test('조회 중 상태를 표시하고 문자열 ID·인증·서버 값과 투영된 경로를 표시한다', async ({
  page,
}) => {
  let complete: () => void = () => {};
  const pending = new Promise<void>((resolve) => {
    complete = resolve;
  });
  await page.route(`**/api/courses/${courseId}`, async (route) => {
    expect(route.request().method()).toBe('GET');
    expect(route.request().headers().authorization).toBe('Bearer e2e-access-token');
    await pending;
    await route.fulfill({ json: course, headers: { ETag: '"version-3"' } });
  });
  await page.goto(`/my-courses/${courseId}`);
  await expect(page.getByRole('status')).toHaveText('코스를 불러오는 중입니다.');
  await expect(page.locator('.ol-viewport')).toHaveCount(0);
  complete();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(course.courseName);
  await expect(page.getByLabel('코스 요약')).toContainText('180.4 m');
  await expect(page.getByLabel('코스 메모')).toContainText('물을 준비하세요.');
  await expect(page.getByRole('link', { name: '편집', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '내보내기', exact: true })).toBeDisabled();

  const map = page.locator('.course-detail-map .orda-map-layout__map-surface');
  await expect(map).toHaveAttribute('data-map-projection', 'EPSG:3857');
  await expect(map).toHaveAttribute('data-map-center', /126\.975000,37\.475/);
  // 외부 타일을 차단한 캔버스에 실제 코스 선의 색상이 그려졌는지 확인한다.
  await expect
    .poll(() =>
      map.locator('canvas').evaluateAll((canvases) =>
        canvases.some((canvas) => {
          const context = canvas.getContext('2d');
          if (!context) return false;
          const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
          for (let i = 0; i < pixels.length; i += 4) {
            if (
              pixels[i] === 7 &&
              pixels[i + 1] === 92 &&
              pixels[i + 2] === 71 &&
              pixels[i + 3] > 200
            )
              return true;
          }
          return false;
        }),
      ),
    )
    .toBe(true);
  await page.getByRole('tab', { name: '지형 분석' }).click();
  await expect(page.getByText('이 코스의 지형 분석 결과는 아직 제공하지 않습니다.')).toBeVisible();
  await expect(page.getByRole('button', { name: '샘플 프로파일 보기' })).toHaveCount(0);
  await page.getByRole('tab', { name: '주변 시설' }).click();
  await expect(page.getByText('이 코스의 주변 시설 정보는 아직 제공하지 않습니다.')).toBeVisible();
});

test('서버 실패 후 수동 재시도로 복구하고 목록 검색 조건을 유지한다', async ({ page }) => {
  let requests = 0;
  await page.route('**/api/courses/101', async (route) => {
    requests++;
    await route.fulfill(
      requests === 1
        ? {
            status: 503,
            json: { status: 503, code: 'COURSE_STATE_UNAVAILABLE', message: '조회 불가' },
          }
        : { json: { ...course, courseId: '101' }, headers: { ETag: '"v1"' } },
    );
  });
  const list = 'q=주말&tab=imported&sort=name';
  await page.goto(`/my-courses/101?${new URLSearchParams({ list })}`);
  await expect(page.getByRole('alert')).toContainText('코스 데이터 상태를 확인할 수 없습니다.');
  expect(requests).toBe(1);
  await page.getByRole('button', { name: '다시 시도', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(course.courseName);
  expect(requests).toBe(2);
  await page.getByRole('link', { name: '내 코스 목록으로', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(2);
  expect(new URL(page.url()).searchParams.get('q')).toBe('주말');
  expect(new URL(page.url()).searchParams.get('tab')).toBe('imported');
  expect(new URL(page.url()).searchParams.get('sort')).toBe('name');
  await page.goBack();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(course.courseName);
  expect(requests).toBe(3);
});

test('코스 없음은 code로 구분하며 다른 404는 일반 조회 실패로 표시한다', async ({ page }) => {
  await page.route('**/api/courses/101', (route) =>
    route.fulfill({
      status: 404,
      json: { status: 404, code: 'COURSE_NOT_FOUND', message: '없음' },
    }),
  );
  await page.goto('/my-courses/101');
  await expect(page.getByRole('alert')).toContainText('코스를 찾을 수 없어요');
  await expect(page.getByRole('button', { name: '다시 시도' })).toHaveCount(0);
  await expect(page.locator('.ol-viewport')).toHaveCount(0);
  await page.route('**/api/courses/102', (route) =>
    route.fulfill({
      status: 404,
      json: { status: 404, code: 'RESOURCE_NOT_FOUND', message: '없음' },
    }),
  );
  await page.goto('/my-courses/102');
  await expect(page.getByRole('alert')).toContainText('코스 상세를 불러오지 못했어요');
  await expect(page.getByRole('button', { name: '다시 시도' })).toBeVisible();
});

test('유효하지 않은 ID는 API를 호출하지 않는다', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/courses/')) requests.push(request.url());
  });
  for (const id of ['unknown-example', '0', '-1', '9223372036854775808']) {
    await page.goto(`/my-courses/${id}`);
    await expect(page.getByRole('heading', { name: '코스를 찾을 수 없어요' })).toBeVisible();
  }
  expect(requests).toEqual([]);
});

test('ETag 누락 시 상세 본문은 유지하고 재조회로 버전 정보를 복구한다', async ({ page }) => {
  let requests = 0;
  await page.route('**/api/courses/101', (route) => {
    requests++;
    return route.fulfill({ json: course, headers: requests === 1 ? {} : { ETag: '"v2"' } });
  });
  await page.goto('/my-courses/101');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(course.courseName);
  await expect(page.getByRole('status')).toContainText(
    '편집에 필요한 버전 정보를 받지 못했습니다.',
  );
  await page.getByRole('button', { name: '상세 다시 조회' }).click();
  await expect(page.getByRole('button', { name: '상세 다시 조회' })).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(course.courseName);
});

test('경로와 메모가 없으면 임의 자료를 대신 표시하지 않는다', async ({ page }) => {
  await page.route('**/api/courses/101', (route) =>
    route.fulfill({
      json: { ...course, geometry: null, memo: null },
      headers: { ETag: '"v1"' },
    }),
  );
  await page.goto('/my-courses/101');
  await expect(page.getByRole('alert')).toHaveText('표시할 수 있는 코스 경로가 없습니다.');
  await expect(page.getByText('등록된 메모가 없습니다.')).toBeVisible();
  await expect(page.locator('.ol-viewport')).toHaveCount(0);
});

test('401이면 기존 인증 흐름으로 로그인 화면에 돌아간다', async ({ page }) => {
  await page.route('**/api/courses/101', (route) =>
    route.fulfill({
      status: 401,
      json: { status: 401, code: 'UNAUTHORIZED', message: '로그인 필요' },
    }),
  );
  await page.goto('/my-courses/101');
  await expect(page).toHaveURL(/\/login\?redirect=/);
  expect(await page.evaluate(() => localStorage.getItem('orda.accessToken'))).toBeNull();
});

test('긴 이름과 메모는 모바일·데스크톱에서 넘치지 않는다', async ({ page }) => {
  await page.route('**/api/courses/101', (route) =>
    route.fulfill({
      json: { ...course, courseName: '긴코스이름'.repeat(20), memo: '긴메모'.repeat(300) },
      headers: { ETag: '"v1"' },
    }),
  );
  for (const width of [390, 1512]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/my-courses/101');
    await expect(page.getByLabel('코스 요약')).toBeVisible();
    await expect(page.locator('.orda-map-layout__map-surface')).toHaveAttribute(
      'data-map-ready',
      'true',
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
    expect(
      await page
        .locator('.course-detail-content')
        .evaluate((element) => element.scrollWidth <= element.clientWidth + 1),
    ).toBe(true);
    await page.screenshot({ path: `test-results/course-api-${width}.png` });
  }
});

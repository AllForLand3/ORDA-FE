import { expect, test } from '../fixtures/authenticatedTest';

test.describe('dev 상세 조회 및 탭 회귀', () => {
  const course = {
    courseId: '6',
    mountainId: '1',
    courseName: '실제 조회 테스트 코스',
    memo: '서버에서 가져온 메모',
    createType: 'IMPORT',
    revNo: 3,
    geometry: {
      type: 'LineString',
      coordinates: [
        [126.96, 37.44],
        [126.97, 37.45],
      ],
    },
    lengthM: 1066.8,
  };

  test('인증된 상세 조회 결과를 표시하고 새로고침·탭·목록 조건을 유지한다', async ({ page }) => {
    await page.route('**/api/courses/6', async (route) => {
      expect(route.request().method()).toBe('GET');
      expect(route.request().headers().authorization).toBe('Bearer e2e-access-token');
      await route.fulfill({ json: course });
    });
    await page.goto('/my-courses/6?list=q%3Dtest');
    await expect(page.getByRole('heading', { name: course.courseName, exact: true })).toBeVisible();
    await expect(page.getByText(course.memo, { exact: true })).toBeVisible();
    await expect(page.getByText('1.07 km', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: '편집', exact: true })).toBeDisabled();
    await page.getByRole('tab', { name: '지형 분석' }).click();
    await expect(page.getByRole('region', { name: '코스 고도 분석', exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('tab', { name: '지형 분석' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await page.getByRole('link', { name: '내 코스 목록으로', exact: true }).click();
    await expect(page).toHaveURL(/\/my-courses\?q=test$/);
  });

  test('응답 대기 중 로딩을 표시하고 응답 후 상세를 표시한다', async ({ page }) => {
    let release = () => {};
    const ready = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route('**/api/courses/6', async (route) => {
      await ready;
      await route.fulfill({ json: course });
    });
    await page.goto('/my-courses/6');
    try {
      await expect(page.getByText('코스 정보를 불러오고 있어요.', { exact: true })).toBeVisible();
    } finally {
      release();
    }
    await expect(page.getByRole('heading', { name: course.courseName, exact: true })).toBeVisible();
  });

  test('통신 실패는 자동 재시도하지 않고 사용자 재시도로 복구한다', async ({ page }) => {
    let requests = 0;
    await page.route('**/api/courses/6', async (route) => {
      requests += 1;
      if (requests === 1) {
        await route.abort('failed');
        return;
      }
      await route.fulfill({ json: course });
    });
    await page.goto('/my-courses/6');
    await expect(page.getByRole('alert')).toContainText('연결 상태를 확인');
    expect(requests).toBe(1);
    await page.getByRole('button', { name: '다시 시도', exact: true }).click();
    await expect(page.getByRole('heading', { name: course.courseName, exact: true })).toBeVisible();
    expect(requests).toBe(2);
  });

  test('없는 코스는 재시도 없이 접근 불가 안내를 표시한다', async ({ page }) => {
    await page.route('**/api/courses/6', async (route) => {
      await route.fulfill({
        status: 404,
        json: { status: 404, code: 'COURSE_NOT_FOUND', message: '코스를 찾을 수 없습니다.' },
      });
    });
    await page.goto('/my-courses/6');
    await expect(
      page.getByRole('heading', { name: '코스를 찾을 수 없어요', exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: '다시 시도', exact: true })).toHaveCount(0);
  });

  test('RESOURCE_NOT_FOUND 상세 응답도 재시도 없는 코스 없음 안내로 표시한다', async ({ page }) => {
    await page.route('**/api/courses/6', async (route) => {
      await route.fulfill({
        status: 404,
        json: { status: 404, code: 'RESOURCE_NOT_FOUND', message: '리소스를 찾을 수 없습니다.' },
      });
    });
    await page.goto('/my-courses/6');
    await expect(
      page.getByRole('heading', { name: '코스를 찾을 수 없어요', exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: '다시 시도', exact: true })).toHaveCount(0);
  });

  test('예시 ID는 Mock 상세를 표시하고 실제 상세 API에 전송하지 않는다', async ({ page }) => {
    const requests: string[] = [];
    await page.route('**/api/courses/**', async (route) => {
      requests.push(route.request().url());
      await route.abort();
    });
    await page.goto('/my-courses/example-ridge-1');
    await expect(page.getByRole('heading', { name: '능선 조망 코스', exact: true })).toBeVisible();
    await expect(page.getByText('5.8km', { exact: true })).toBeVisible();
    await expect(page.locator('.elevation-profile__chart')).toHaveAttribute(
      'data-chart-ready',
      'true',
    );
    await page.getByRole('tab', { name: '코스 분석', exact: true }).click();
    await expect(page.getByText('604m', { exact: true })).toBeVisible();
    await page.getByRole('tab', { name: '주변 시설', exact: true }).click();
    await expect(page.getByRole('heading', { name: '능선 조망 코스 주변 시설' })).toBeVisible();
    await page.getByRole('button', { name: '화장실 3' }).click();
    await expect(page.locator('.nearby-facilities__list > li')).toHaveCount(3);
    await page
      .locator('.nearby-facility-card')
      .first()
      .getByText('상세 정보', { exact: true })
      .click();
    await expect(page.getByText('서울 관악구 신림동 203-1', { exact: true })).toBeVisible();
    expect(requests).toEqual([]);
  });

  test.beforeEach(async ({ page }) => {
    await page.route('**/api/courses/*/elevation-profile?*', async (route) => {
      await route.fulfill({
        status: 404,
        json: {
          status: 404,
          code: 'RESOURCE_NOT_FOUND',
          message: '현재 조건의 분석 결과가 없습니다.',
        },
      });
    });
  });
});

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
  // 상세 화면의 dev 분석 조회도 격리한다. 분석 동작 자체는 전용 스펙에서 검증한다.
  await page.route('**/api/courses/*/elevation-profile?*', (route) =>
    route.fulfill({
      status: 404,
      json: { status: 404, code: 'RESOURCE_NOT_FOUND', message: '분석 결과가 없습니다.' },
    }),
  );
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
  await expect(page.getByRole('status')).toHaveText('코스 정보를 불러오고 있어요.');
  await expect(page.locator('.ol-viewport')).toHaveCount(0);
  complete();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(course.courseName);
  await expect(page.getByLabel('코스 요약 지표')).toContainText('180.4 m');
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
  await expect(page.getByRole('region', { name: '코스 고도 분석' })).toBeVisible();
  await expect(page.getByRole('button', { name: '샘플 프로파일 보기' })).toHaveCount(0);
  await page.getByRole('tab', { name: '주변 시설' }).click();
  await expect(page.getByText('표시할 시설이 없어요', { exact: true })).toBeVisible();
});

test('서버 실패 후 수동 재시도로 복구하고 목록과 상세 사이를 이동한다', async ({ page }) => {
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
  await page.goto('/my-courses/101');
  await expect(page.getByRole('alert')).toContainText('코스 정보에 문제가 있어요.');
  expect(requests).toBe(1);
  await page.getByRole('button', { name: '다시 시도', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(course.courseName);
  expect(requests).toBe(2);
  await page.getByRole('link', { name: '내 코스 목록으로', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(2);
  await expect(page).toHaveURL('/my-courses');
  await page.goBack();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(course.courseName);
  expect(requests).toBe(3);
});

test('코스 없음은 두 리소스 오류 code로 구분하고 미확인 404는 일반 실패로 표시한다', async ({
  page,
}) => {
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
  await expect(page.getByRole('alert')).toContainText('코스를 찾을 수 없어요');
  await expect(page.getByRole('button', { name: '다시 시도' })).toHaveCount(0);
  await page.route('**/api/courses/103', (route) =>
    route.fulfill({ status: 404, json: { status: 404, code: 'UNKNOWN', message: '없음' } }),
  );
  await page.goto('/my-courses/103');
  await expect(page.getByRole('alert')).toContainText('코스 정보를 불러오지 못했어요');
  await expect(page.getByRole('button', { name: '다시 시도' })).toBeVisible();
});

for (const suffix of ['', '/edit']) {
  test(`권한 오류는 FORBIDDEN 코드로 안내하고 재시도를 제공하지 않는다 (${suffix || '상세'})`, async ({
    page,
  }) => {
    let requests = 0;
    await page.route('**/api/courses/101', (route) => {
      requests++;
      return route.fulfill({
        status: 403,
        json: { status: 403, code: 'FORBIDDEN', message: '접근 권한이 없습니다.' },
      });
    });
    await page.goto(`/my-courses/101${suffix}`);
    await expect(page.getByRole('alert')).toContainText('접근 권한이나 접속 환경을 확인해주세요.');
    await expect(page.getByRole('button', { name: '다시 시도' })).toHaveCount(0);
    await expect(page.locator('.ol-viewport')).toHaveCount(0);
    expect(requests).toBe(1);
  });
}

for (const id of ['unknown-example', 'example-ridge-1', '0', '-1', '9223372036854775808']) {
  test(`비 API ID ${id}는 상세 API를 호출하지 않는다`, async ({ page }) => {
    const requests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/courses/')) requests.push(request.url());
    });
    await page.goto(`/my-courses/${id}`);
    await expect(
      page.getByRole('heading', {
        name: id === 'example-ridge-1' ? '능선 조망 코스' : '코스를 찾을 수 없어요',
        exact: true,
      }),
    ).toBeVisible();
    expect(requests).toEqual([]);
  });
}

test('ETag 누락 시 상세 본문은 유지하고 재조회로 버전 정보를 복구한다', async ({ page }) => {
  let requests = 0;
  await page.route('**/api/courses/101', (route) => {
    requests++;
    return route.fulfill({ json: course, headers: requests === 1 ? {} : { ETag: '"v2"' } });
  });
  await page.goto('/my-courses/101');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(course.courseName);
  await expect(
    page.getByText('편집에 필요한 버전 정보를 받지 못했습니다. 상세 정보를 다시 조회해주세요.'),
  ).toBeVisible();
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
    await expect(page.getByLabel('코스 요약 지표')).toBeVisible();
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

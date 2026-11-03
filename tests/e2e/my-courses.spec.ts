import { expect, test } from '../fixtures/authenticatedTest';
import { courseListDetail, courseListItems, courseListPage } from '../fixtures/courseList';

test.beforeEach(async ({ page }) => {
  await page.route('https://*.tile.openstreetmap.org/**', (route) => route.abort());
});

test('인증된 목록 응답의 순서·문자열 ID·실제 값과 결측값을 표시한다', async ({ page }) => {
  await page.route(/\/api\/courses(?:\?.*)?$/, (route) => {
    expect(route.request().method()).toBe('GET');
    expect(route.request().headers().authorization).toBe('Bearer e2e-access-token');
    expect(new URL(route.request().url()).search).toBe('?page=0');
    return route.fulfill({ json: courseListPage() });
  });
  await page.goto('/my-courses');
  await expect(page.getByRole('heading', { name: '내 코스', exact: true })).toBeVisible();
  const cards = page.getByRole('article');
  await expect(cards).toHaveCount(2);
  await expect(cards.nth(0)).toHaveAccessibleName(courseListItems[0].courseName);
  await expect(cards.nth(1)).toHaveAccessibleName(courseListItems[1].courseName);
  await expect(cards.nth(0)).toContainText('주말 아침 등산');
  await expect(cards.nth(0)).toContainText('가져온 코스');
  await expect(cards.nth(0)).toContainText('5.8km');
  await expect(cards.nth(0)).toContainText('160분');
  await expect(cards.nth(0).locator('dd')).toHaveText(['5.8km', '160분', '보통']);
  await expect(cards.nth(0).locator('time')).toHaveText('2026. 11. 04.');
  await expect(cards.nth(0).locator('.my-course-card__facilities li')).toHaveText([
    '화장실0곳',
    '주차장1곳',
  ]);
  await expect(cards.nth(0).locator('.my-course-card__facts > span')).toHaveText([
    '조망 지점 3곳',
    '계단 지점 2곳',
  ]);
  await expect(cards.nth(1)).toContainText('저장일 미확인');
  await expect(cards.nth(1)).toContainText('주변 정보가 아직 제공되지 않는 코스입니다.');
  await expect(cards.nth(1)).toContainText('저장한 코스');
  await expect(cards.nth(1).locator('dd')).toHaveText(['미확인', '미확인', '미산정']);
  await expect(
    cards.nth(0).getByRole('link', { name: '코스 상세 보기', exact: true }),
  ).toHaveAttribute('href', `/my-courses/${courseListItems[0].courseId}`);
  await expect(cards.nth(0).getByRole('link', { name: '편집', exact: true })).toHaveAttribute(
    'href',
    `/my-courses/${courseListItems[0].courseId}/edit`,
  );
});

for (const width of [360, 390, 1512]) {
  test(`긴 코스명과 메모를 ${width}px 카드 안에서 잘라내지 않고 줄바꿈한다`, async ({ page }) => {
    const courseName = 'A'.repeat(100);
    const memo = 'M'.repeat(1000);
    await page.route(/\/api\/courses(?:\?.*)?$/, (route) =>
      route.fulfill({ json: courseListPage([{ ...courseListItems[0], courseName, memo }]) }),
    );
    await page.setViewportSize({ width, height: 982 });
    await page.goto('/my-courses');
    const card = page.getByRole('article');
    const heading = card.getByRole('heading', { name: courseName, exact: true });
    const memoText = card.getByText(memo, { exact: true });
    await expect(heading).toHaveText(courseName);
    await expect(memoText).toHaveText(memo);
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
    for (const content of [card, heading, memoText]) {
      expect(await content.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
        true,
      );
    }
  });
}

test('응답 전에는 로딩을 표시하고 예시 코스를 대신 표시하지 않는다', async ({ page }) => {
  let release = () => {};
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(/\/api\/courses(?:\?.*)?$/, async (route) => {
    await pending;
    await route.fulfill({ json: courseListPage() });
  });
  try {
    await page.goto('/my-courses');
    await expect(page.getByRole('status')).toContainText('코스 목록을 불러오는 중입니다.');
    await expect(page.getByRole('article')).toHaveCount(0);
    release();
    await expect(page.getByRole('article')).toHaveCount(2);
  } finally {
    release();
  }
});

test('전체 개수가 0이면 빈 목록을 표시하고 업로드 화면에서 돌아온다', async ({ page }) => {
  await page.route(/\/api\/courses(?:\?.*)?$/, (route) =>
    route.fulfill({ json: courseListPage([]) }),
  );
  await page.route('**/api/mountains?*', (route) =>
    route.fulfill({ json: { items: [], page: 0, size: 100, totalElements: 0, totalPages: 0 } }),
  );
  await page.goto('/my-courses');
  await expect(page.getByRole('heading', { name: '저장한 코스가 없어요' })).toBeVisible();
  await expect(page.getByRole('article')).toHaveCount(0);
  await page.getByRole('button', { name: '코스 업로드', exact: true }).click();
  await expect(page).toHaveURL('/my-courses/import');
  await expect(page.getByRole('button', { name: '파일 선택', exact: true })).toBeVisible();
  await page.getByRole('link', { name: '취소', exact: true }).click();
  await expect(page).toHaveURL('/my-courses');
  await expect(page.getByRole('heading', { name: '저장한 코스가 없어요' })).toBeVisible();
});

test('목록 실패는 빈 결과와 구분하고 자동 재시도 없이 버튼으로 복구한다', async ({ page }) => {
  let requests = 0;
  await page.route(/\/api\/courses(?:\?.*)?$/, (route) => {
    requests++;
    return route.fulfill(
      requests === 1
        ? {
            status: 503,
            json: { status: 503, code: 'INTERNAL_SERVER_ERROR', message: '조회 실패' },
          }
        : { json: courseListPage() },
    );
  });
  await page.goto('/my-courses');
  await expect(page.getByRole('alert')).toContainText('코스 목록을 불러오지 못했어요');
  await expect(page.getByRole('heading', { name: '저장한 코스가 없어요' })).toHaveCount(0);
  expect(requests).toBe(1);
  await page.getByRole('button', { name: '다시 시도', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(2);
  expect(requests).toBe(2);
});

test('실제 상세·편집으로 이동하고 복귀·새로고침·브라우저 이력에서 최신 목록을 조회한다', async ({
  page,
}) => {
  let renamed = false;
  await page.route(/\/api\/courses(?:\?.*)?$/, (route) =>
    route.fulfill({
      json: courseListPage(
        renamed ? [{ ...courseListItems[0], courseName: '서버에서 변경된 코스' }] : courseListItems,
      ),
    }),
  );
  await page.route(`**/api/courses/${courseListDetail.courseId}`, (route) =>
    route.fulfill({
      json: renamed
        ? { ...courseListDetail, courseName: '서버에서 변경된 코스' }
        : courseListDetail,
      headers: { ETag: renamed ? '"v2"' : '"v1"' },
    }),
  );
  await page.goto('/my-courses');
  await page
    .getByRole('article')
    .first()
    .getByRole('link', { name: '코스 상세 보기', exact: true })
    .click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(courseListDetail.courseName);
  await expect(page.locator('.course-detail-map .orda-map-layout__map-surface')).toHaveAttribute(
    'data-map-projection',
    'EPSG:3857',
  );
  renamed = true;
  await page.getByRole('link', { name: '내 코스 목록으로', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(1);
  await expect(page.getByRole('article')).toHaveAccessibleName('서버에서 변경된 코스');
  await page.reload();
  await expect(page.getByRole('article')).toHaveAccessibleName('서버에서 변경된 코스');
  await page.getByRole('link', { name: '편집', exact: true }).click();
  await expect(page).toHaveURL(`/my-courses/${courseListDetail.courseId}/edit`);
  await expect(page.getByRole('textbox', { name: '코스 이름' })).toHaveValue(
    '서버에서 변경된 코스',
  );
  await page.goBack();
  await expect(page.getByRole('article')).toHaveAccessibleName('서버에서 변경된 코스');
  await page.goForward();
  await expect(page.getByRole('textbox', { name: '코스 이름' })).toHaveValue(
    '서버에서 변경된 코스',
  );
});

test('목록 인증이 만료되면 로그인 화면으로 이동한다', async ({ page }) => {
  await page.route(/\/api\/courses(?:\?.*)?$/, (route) =>
    route.fulfill({
      status: 401,
      json: { status: 401, code: 'UNAUTHORIZED', message: '인증 필요' },
    }),
  );
  await page.goto('/my-courses');
  await expect(page).toHaveURL(/\/login\?/);
  await expect(page.getByRole('heading', { name: '로그인', exact: true })).toBeVisible();
});

test('잘못된 상세 ID는 예시 화면으로 대체하지 않고 코스 없음으로 표시한다', async ({ page }) => {
  await page.goto('/my-courses/unknown-example');
  await expect(page.getByRole('heading', { name: '코스를 찾을 수 없어요' })).toBeVisible();
  await expect(page.locator('.ol-viewport')).toHaveCount(0);
  await page.goto('/my-courses/example-ridge-1?preview=error');
  await expect(page.getByRole('alert')).toContainText('코스를 찾을 수 없어요');
  await expect(page.getByRole('button', { name: '다시 시도' })).toHaveCount(0);
  await expect(page.locator('.ol-viewport')).toHaveCount(0);
});

test('목록과 실제 상세는 360~1512px에서 이미지·지도·내비게이션을 표시한다', async ({ page }) => {
  await page.route(`**/api/courses/${courseListDetail.courseId}`, (route) =>
    route.fulfill({ json: courseListDetail, headers: { ETag: '"v1"' } }),
  );
  for (const viewport of [
    { width: 360, height: 800 },
    { width: 390, height: 844 },
    { width: 440, height: 956 },
    { width: 768, height: 1024 },
    { width: 1024, height: 768 },
    { width: 1440, height: 900 },
    { width: 1512, height: 982 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/my-courses');
    await expect(page.getByRole('article')).toHaveCount(2);
    const navigation = page.getByRole('navigation', { name: '내 코스 내비게이션' });
    if (viewport.width < 768) await expect(navigation).toBeVisible();
    else await expect(navigation).not.toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      viewport.width,
    );
    for (const image of await page.locator('.my-course-card__image').all()) {
      await image.scrollIntoViewIfNeeded();
      await expect
        .poll(() =>
          image.evaluate(
            (element) =>
              element instanceof HTMLImageElement && element.complete && element.naturalWidth > 0,
          ),
        )
        .toBe(true);
    }
    await expect(page.getByText('예시 이미지', { exact: true })).toHaveCount(2);
    if (viewport.width === 440 || viewport.width === 1512)
      await page.screenshot({ path: `test-results/my-courses-${viewport.width}.png` });
    await page.getByRole('link', { name: '코스 상세 보기', exact: true }).first().click();
    const map = page.locator('.course-detail-map .orda-map-layout__map-surface');
    await expect(map).toHaveAttribute('data-map-ready', 'true');
    await expect(map).toHaveAttribute('data-map-zoom', /^\d+(\.\d+)?$/);
    const initialZoom = Number(await map.getAttribute('data-map-zoom'));
    await page.getByRole('button', { name: '+', exact: true }).click();
    await expect
      .poll(async () => Number(await map.getAttribute('data-map-zoom')))
      .toBeCloseTo(Math.min(19, initialZoom + 1), 1);
    expect(
      await page.locator('.ol-attribution').evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return element.contains(
          document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2),
        );
      }),
    ).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      viewport.width,
    );
    if (viewport.width >= 768) {
      const content = await page.locator('.course-detail-content').boundingBox();
      const mapBox = await map.boundingBox();
      if (!content || !mapBox) throw new Error('PC 상세 레이아웃이 없습니다.');
      expect(content.x + content.width).toBeLessThanOrEqual(mapBox.x + 1);
    }
    await page.getByRole('link', { name: '내 코스 목록으로', exact: true }).click();
    await expect(page).toHaveURL('/my-courses');
  }
  for (const entry of ['/mountains', '/routes/results']) {
    await page.goto(entry);
    await page.getByRole('link', { name: '내 코스', exact: true }).click();
    await expect(page.getByRole('heading', { name: '내 코스', exact: true })).toBeVisible();
  }
});

test('주변 자료가 없는 코스는 개수를 0으로 채우지 않는다', async ({ page }) => {
  await page.route(/\/api\/courses(?:\?.*)?$/, (route) =>
    route.fulfill({
      json: courseListPage([
        {
          ...courseListItems[0],
          savedAt: null,
          difficultyCode: null,
          nearby: {
            radiusM: 200,
            spotDataAvailable: false,
            facilityDataAvailable: false,
            viewSpotCount: null,
            stairSpotCount: null,
            toiletCount: null,
            parkingCount: null,
          },
        },
      ]),
    }),
  );
  await page.goto('/my-courses');
  const card = page.getByRole('article');
  await expect(card.locator('dd')).toHaveText(['5.8km', '160분', '미산정']);
  await expect(card.locator('time')).toHaveCount(0);
  await expect(card.locator('.my-course-card__facilities li')).toHaveText([
    '화장실정보 없음',
    '주차장정보 없음',
  ]);
  await expect(card.locator('.my-course-card__facts > span')).toHaveText([
    '조망 지점 정보 없음',
    '계단 지점 정보 없음',
  ]);
  await expect(card).toContainText('코스 반경 200m 내 등록된 지점·시설 기준입니다.');
});

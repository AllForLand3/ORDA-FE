import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures/authenticatedTest';

const geometry = {
  type: 'LineString',
  coordinates: [
    [126.97, 37.47],
    [126.975, 37.48],
    [126.98, 37.475],
  ],
};
const mountain = { mountainId: '9007199254740993', mountainName: '관악산' };
const course = {
  courseId: '9007199254740995',
  mountainId: mountain.mountainId,
  courseName: '내 코스',
  memo: '내 메모',
  createType: 'IMPORT',
  revNo: 1,
  lengthM: 180.4,
  geometry,
};

async function upload(page: Page, value: unknown, name = '등산코스.geojson') {
  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: '파일 선택', exact: true }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles({
    name,
    mimeType: 'application/geo+json',
    buffer: Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)),
  });
}
async function selectMountain(page: Page) {
  await page.getByRole('button', { name: '코스가 속한 산', exact: true }).click();
  await page.getByRole('option', { name: '관악산', exact: true }).click();
}

test.beforeEach(async ({ page }) => {
  await page.route('https://*.tile.openstreetmap.org/**', (route) => route.abort());
  await page.route('**/api/mountains?*', (route) =>
    route.fulfill({
      json: { items: [mountain], page: 0, size: 100, totalElements: 1, totalPages: 1 },
    }),
  );
});

for (const [kind, value] of [
  ['LineString', geometry],
  [
    'Feature',
    {
      type: 'Feature',
      properties: { ownerUserId: '악의적 속성', courseName: '파일의 이름' },
      geometry,
    },
  ],
  [
    'FeatureCollection',
    { type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry }] },
  ],
] as const) {
  test(`${kind}를 미리보고 원래 좌표 순서와 실제 산 ID로 등록한다`, async ({ page }) => {
    let posts = 0;
    await page.route('**/api/courses', async (route) => {
      posts++;
      expect(route.request().method()).toBe('POST');
      expect(route.request().headers().authorization).toBe('Bearer e2e-access-token');
      expect(route.request().postDataJSON()).toEqual({
        mountainId: mountain.mountainId,
        courseName: '내 코스',
        memo: '내 메모',
        createType: 'IMPORT',
        geometry,
      });
      return route.fulfill({ status: 201, json: course, headers: { ETag: '"v1"' } });
    });
    await page.route(`**/api/courses/${course.courseId}`, (route) =>
      route.fulfill({ json: course, headers: { ETag: '"v1"' } }),
    );
    await page.goto('/my-courses?tab=imported&q=주말&sort=name');
    await page.getByRole('button', { name: '코스 업로드' }).click();
    await expect(page.getByRole('button', { name: '등록', exact: true })).toBeDisabled();
    await upload(page, value);
    const map = page.locator('.orda-map-layout__map-surface');
    await expect(map).toHaveAttribute('data-map-ready', 'true');
    await expect(map).toHaveAttribute('data-map-center', /126\.975000,37\.475/);
    expect(posts).toBe(0);
    await selectMountain(page);
    await page.getByRole('textbox', { name: '코스 이름', exact: true }).fill('내 코스');
    await page.getByRole('textbox', { name: '메모', exact: true }).fill('내 메모');
    await page.getByRole('button', { name: '등록', exact: true }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('내 코스');
    await expect(page).toHaveURL(new RegExp(`/my-courses/${course.courseId}`));
    expect(new URLSearchParams(new URL(page.url()).searchParams.get('list') ?? '').get('q')).toBe(
      '주말',
    );
    expect(posts).toBe(1);
  });
}

test('잘못된 파일을 거부하고 이전 경로를 지워 잘못 등록하지 않는다', async ({ page }) => {
  await page.goto('/my-courses/import');
  await upload(page, geometry);
  await expect(page.locator('.ol-viewport')).toHaveCount(1);
  for (const [value, name] of [
    ['{broken', 'bad.json'],
    [{ type: 'FeatureCollection', features: [] }, 'empty.json'],
    [
      {
        type: 'FeatureCollection',
        features: [
          { type: 'Feature', geometry },
          { type: 'Feature', geometry },
        ],
      },
      'many.json',
    ],
    [{ type: 'MultiLineString', coordinates: [geometry.coordinates] }, 'multi.json'],
    [
      {
        type: 'LineString',
        coordinates: [
          [126, 37, 10],
          [127, 38, 20],
        ],
      },
      '3d.json',
    ],
    [
      {
        type: 'LineString',
        coordinates: [
          [126, 37],
          [126, 37],
        ],
      },
      'same.json',
    ],
    [
      {
        type: 'LineString',
        coordinates: [
          [181, 37],
          [126, 37],
        ],
      },
      'range.json',
    ],
    [{ type: 'Feature', geometry: null }, 'null.json'],
    [{ ...geometry, crs: { type: 'name', properties: { name: 'EPSG:5179' } } }, 'crs.json'],
    [geometry, 'bad.gpx'],
  ] as const) {
    await upload(page, value, name);
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.locator('.ol-viewport')).toHaveCount(0);
    await expect(page.getByRole('button', { name: '등록', exact: true })).toBeDisabled();
  }
  await upload(page, geometry);
  await expect(page.locator('.ol-viewport')).toHaveCount(1);
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('영역·크기 오류 뒤 입력과 파일을 유지하며 수동 재시도로 등록한다', async ({ page }) => {
  let posts = 0;
  await page.route('**/api/courses', (route) => {
    posts++;
    return route.fulfill(
      posts === 1
        ? { status: 400, json: { code: 'COURSE_OUTSIDE_SERVICE_AREA' } }
        : posts === 2
          ? { status: 413, json: { code: 'PAYLOAD_TOO_LARGE' } }
          : { status: 201, json: course },
    );
  });
  await page.route(`**/api/courses/${course.courseId}`, (route) => route.fulfill({ json: course }));
  await page.goto('/my-courses/import');
  await upload(page, geometry);
  await selectMountain(page);
  const name = page.getByRole('textbox', { name: '코스 이름', exact: true });
  await name.fill('보존할 코스');
  const save = page.getByRole('button', { name: '등록', exact: true });
  await save.click();
  await expect(page.getByRole('alert')).toContainText('서비스 영역');
  expect(posts).toBe(1);
  await expect(name).toHaveValue('보존할 코스');
  await expect(page.locator('.ol-viewport')).toHaveCount(1);
  await save.click();
  await expect(page.getByRole('alert')).toContainText('요청 크기를 초과');
  expect(posts).toBe(2);
  await save.click();
  await expect(page).toHaveURL(new RegExp(course.courseId));
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('내 코스');
  expect(posts).toBe(3);
});

test('산 목록 오류·빈 결과·페이지 추가 조회를 처리한다', async ({ page }) => {
  let requests = 0;
  await page.route('**/api/mountains?*', (route) => {
    requests++;
    const pageNumber = Number(new URL(route.request().url()).searchParams.get('page'));
    return route.fulfill(
      requests === 1
        ? { status: 503, json: { code: 'SERVICE_UNAVAILABLE' } }
        : {
            json: {
              items: pageNumber === 0 ? [] : [mountain],
              page: pageNumber,
              size: 100,
              totalElements: 1,
              totalPages: requests === 2 ? 0 : 2,
            },
          },
    );
  });
  await page.goto('/my-courses/import');
  await expect(page.getByRole('alert')).toContainText('산 목록을 불러오지 못했습니다.');
  expect(requests).toBe(1);
  await page.getByRole('button', { name: '산 목록 다시 조회' }).click();
  await expect(page.getByText('등록할 수 있는 산이 없습니다.')).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: '산 더 불러오기' }).click();
  await selectMountain(page);
  await expect(page.getByRole('button', { name: '코스가 속한 산', exact: true })).toContainText(
    '관악산',
  );
});

test('필수값·Unicode 길이를 검사하고 취소 시 입력 유실을 확인한다', async ({ page }) => {
  let posts = 0;
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url().endsWith('/api/courses')) posts++;
  });
  await page.goto('/my-courses/import');
  await upload(page, geometry);
  const save = page.getByRole('button', { name: '등록', exact: true });
  await save.click();
  await expect(page.getByRole('alert')).toContainText('산을 선택해주세요.');
  await selectMountain(page);
  const name = page.getByRole('textbox', { name: '코스 이름', exact: true });
  await name.fill('🌲'.repeat(101));
  await save.click();
  await expect(page.getByText('코스 이름은 100자 이내로 입력해주세요.')).toBeVisible();
  expect(posts).toBe(0);
  await page.getByRole('link', { name: '취소', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '가져오기를 나갈까요?' });
  await dialog.getByRole('button', { name: '계속 작성' }).click();
  await expect(name).toHaveValue('🌲'.repeat(101));
  await page.getByRole('link', { name: '취소', exact: true }).click();
  await dialog.getByRole('button', { name: '입력 버리고 나가기' }).click();
  await expect(page).toHaveURL(/\/my-courses$/);
});

test('등록 중 중복 제출을 막고 모바일·PC에서 미리보기와 입력이 넘치지 않는다', async ({ page }) => {
  let complete: () => void = () => {};
  const pending = new Promise<void>((resolve) => {
    complete = resolve;
  });
  let posts = 0;
  await page.route('**/api/courses', async (route) => {
    posts++;
    await pending;
    return route.fulfill({ status: 201, json: course, headers: { ETag: '"v1"' } });
  });
  await page.route(`**/api/courses/${course.courseId}`, (route) =>
    route.fulfill({ json: course, headers: { ETag: '"v1"' } }),
  );
  await page.goto('/my-courses/import');
  await upload(page, geometry, '긴파일이름'.repeat(25) + '.geojson');
  await selectMountain(page);
  await page.getByRole('textbox', { name: '코스 이름', exact: true }).fill('내 코스');
  for (const width of [390, 1512]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.locator('.orda-map-layout__map-surface')).toHaveAttribute(
      'data-map-ready',
      'true',
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
    await page.screenshot({ path: `test-results/course-import-${width}.png` });
  }
  await page.getByRole('button', { name: '등록', exact: true }).click();
  await expect(page.getByLabel('GeoJSON 파일')).toBeDisabled();
  await page
    .locator('#course-import-form')
    .evaluate((form) =>
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })),
    );
  complete();
  await expect(page).toHaveURL(new RegExp(course.courseId));
  expect(posts).toBe(1);
});

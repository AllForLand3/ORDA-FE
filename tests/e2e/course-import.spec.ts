import { courseListPage } from '../fixtures/courseList';
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

// 외부 배경 타일을 차단한 상태에서 실제 경로 선의 화면상 범위를 확인한다.
async function routePixelBounds(page: Page) {
  return page.locator('.ol-viewport canvas').evaluateAll((canvases) => {
    let top = Infinity;
    let bottom = -Infinity;
    for (const canvas of canvases) {
      const context = canvas.getContext('2d');
      if (!context) continue;
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      const rect = canvas.getBoundingClientRect();
      for (let i = 0; i < pixels.length; i += 4) {
        if (
          pixels[i] === 7 &&
          pixels[i + 1] === 92 &&
          pixels[i + 2] === 71 &&
          pixels[i + 3] > 200
        ) {
          const y = rect.top + (Math.floor(i / 4 / canvas.width) * rect.height) / canvas.height;
          top = Math.min(top, y);
          bottom = Math.max(bottom, y);
        }
      }
    }
    return Number.isFinite(top) ? { top, bottom } : null;
  });
}

test.beforeEach(async ({ page }) => {
  await page.route('https://*.tile.openstreetmap.org/**', (route) => route.abort());
  await page.route('**/api/mountains?*', (route) =>
    route.fulfill({
      json: { items: [mountain], page: 0, size: 100, totalElements: 1, totalPages: 1 },
    }),
  );
});

test('가져오기 지도에서 선을 클릭해도 파일 원본 좌표로 등록한다', async ({ page }) => {
  let body: unknown;
  await page.setViewportSize({ width: 1512, height: 900 });
  const original = {
    type: 'LineString',
    coordinates: [
      [126.974, 37.475],
      [126.975, 37.475],
      [126.976, 37.475],
    ],
  };
  await page.route(/\/api\/courses(?:\?.*)?$/, (route) => {
    body = route.request().postDataJSON();
    return route.fulfill({
      status: 201,
      json: { ...course, geometry: original },
      headers: { ETag: '"v1"' },
    });
  });
  await page.route(`**/api/courses/${course.courseId}`, (route) =>
    route.fulfill({ json: { ...course, geometry: original }, headers: { ETag: '"v1"' } }),
  );
  await page.goto('/my-courses/import');
  await upload(page, original);
  const map = page.locator('.orda-map-layout__map-surface');
  await expect(map).toHaveAttribute('data-map-center', '126.975000,37.475000');
  const box = await map.boundingBox();
  if (!box) throw new Error('지도가 표시되지 않았습니다.');
  await page.mouse.click(box.x + box.width / 2 + 70, box.y + box.height / 2);
  await page.keyboard.down('Alt');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.keyboard.up('Alt');
  await selectMountain(page);
  await page.getByRole('textbox', { name: '코스 이름', exact: true }).fill(course.courseName);
  await page.getByRole('button', { name: '등록', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/my-courses/${course.courseId}`));
  expect(body).toEqual({
    mountainId: mountain.mountainId,
    courseName: course.courseName,
    memo: null,
    createType: 'IMPORT',
    geometry: original,
  });
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
    await page.route(/\/api\/courses(?:\?.*)?$/, async (route) => {
      if (route.request().method() === 'GET') {
        return route.fulfill({
          json: courseListPage(
            posts === 0
              ? []
              : [
                  {
                    courseId: course.courseId,
                    mountainId: course.mountainId,
                    mountainName: '관악산',
                    courseName: '내 코스',
                    memo: '내 메모',
                    createType: 'IMPORT',
                    lengthM: course.lengthM,
                    estTimeMin: null,
                  },
                ],
          ),
        });
      }
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
    await page.goto('/my-courses');
    await page.getByRole('button', { name: '코스 업로드' }).click();
    await expect(page.getByRole('button', { name: '등록', exact: true })).toBeDisabled();
    await upload(page, value);
    const map = page.locator('.orda-map-layout__map-surface');
    await expect(map).toHaveAttribute('data-map-ready', 'true');
    await expect(map).toHaveAttribute('data-map-center', /126\.975000,37\.475/);
    await expect.poll(() => routePixelBounds(page)).not.toBeNull();
    expect(posts).toBe(0);
    await selectMountain(page);
    await page.getByRole('textbox', { name: '코스 이름', exact: true }).fill('내 코스');
    await page.getByRole('textbox', { name: '메모', exact: true }).fill('내 메모');
    await page.getByRole('button', { name: '등록', exact: true }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('내 코스');
    await expect(page).toHaveURL(new RegExp(`/my-courses/${course.courseId}`));
    expect(posts).toBe(1);
    await page.getByRole('link', { name: '내 코스 목록으로', exact: true }).click();
    await expect(page).toHaveURL('/my-courses');
    await expect(page.getByRole('article', { name: '내 코스', exact: true })).toBeVisible();
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

test('128KiB 초과 파일은 읽지 않고 거부하며 경계 크기 파일을 다시 선택할 수 있다', async ({
  page,
}) => {
  await page.goto('/my-courses/import');
  await page.evaluate(() => {
    const read = File.prototype.text;
    document.documentElement.dataset.fileReadCount = '0';
    File.prototype.text = function () {
      const root = document.documentElement;
      root.dataset.fileReadCount = String(Number(root.dataset.fileReadCount) + 1);
      return read.call(this);
    };
  });
  await upload(page, geometry);
  await expect(page.locator('.ol-viewport')).toHaveCount(1);
  await selectMountain(page);
  const name = page.getByRole('textbox', { name: '코스 이름', exact: true });
  const memo = page.getByRole('textbox', { name: '메모', exact: true });
  await name.fill('유지할 이름');
  await memo.fill('유지할 메모');
  // UTF-8 바이트 수로 경계를 만든다. 문자열 길이로 검사하면 초과 파일을 놓친다.
  const feature = JSON.stringify({ type: 'Feature', properties: { note: '산' }, geometry });
  const boundary = feature + ' '.repeat(131_072 - Buffer.byteLength(feature, 'utf8'));
  expect(Buffer.byteLength(boundary, 'utf8')).toBe(131_072);
  const tooLarge = boundary + ' ';
  expect(tooLarge.length).toBeLessThanOrEqual(131_072);
  await upload(page, tooLarge, '경계.geojson');
  await expect(page.getByRole('alert')).toHaveText(
    '파일은 128KiB(131,072바이트) 이하만 가져올 수 있습니다.',
  );
  await expect(page.locator('html')).toHaveAttribute('data-file-read-count', '1');
  await expect(page.locator('.ol-viewport')).toHaveCount(0);
  const save = page.getByRole('button', { name: '등록', exact: true });
  await expect(save).toBeDisabled();
  await expect(name).toHaveValue('유지할 이름');
  await expect(memo).toHaveValue('유지할 메모');
  await expect(page.getByRole('button', { name: '코스가 속한 산', exact: true })).toContainText(
    '관악산',
  );
  await upload(page, boundary, '경계.geojson');
  await expect(page.locator('.ol-viewport')).toHaveCount(1);
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.locator('html')).toHaveAttribute('data-file-read-count', '2');
  await expect(save).toBeEnabled();
  await expect(name).toHaveValue('유지할 이름');
  await expect(memo).toHaveValue('유지할 메모');
});

test('영역·크기 오류 뒤 입력과 파일을 유지하며 수동 재시도로 등록한다', async ({ page }) => {
  let posts = 0;
  let submittedName: unknown;
  const saved = { ...course, courseName: '보존할 코스' };
  await page.route(/\/api\/courses(?:\?.*)?$/, (route) => {
    posts++;
    submittedName = route.request().postDataJSON()?.courseName;
    return route.fulfill(
      posts === 1
        ? { status: 400, json: { code: 'COURSE_OUTSIDE_SERVICE_AREA' } }
        : posts === 2
          ? { status: 413, json: { code: 'PAYLOAD_TOO_LARGE' } }
          : { status: 201, json: saved },
    );
  });
  await page.route(`**/api/courses/${course.courseId}`, (route) => route.fulfill({ json: saved }));
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
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('보존할 코스');
  expect(submittedName).toBe('보존할 코스');
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
  await expect(page.getByRole('button', { name: '코스가 속한 산', exact: true })).toBeFocused();
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
  await page.route(/\/api\/courses(?:\?.*)?$/, async (route) => {
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

test('EPSG:3857 범위를 넘는 위도는 미리보기만 제한하고 원본 좌표로 등록한다', async ({ page }) => {
  const polarGeometry = {
    type: 'LineString',
    coordinates: [
      [126, 86],
      [127, 90],
    ],
  };
  let submittedGeometry: unknown;
  await page.route(/\/api\/courses(?:\?.*)?$/, (route) => {
    submittedGeometry = route.request().postDataJSON()?.geometry;
    return route.fulfill({ status: 201, json: { ...course, geometry: polarGeometry } });
  });
  await page.route(`**/api/courses/${course.courseId}`, (route) =>
    route.fulfill({ json: { ...course, geometry: polarGeometry } }),
  );
  await page.goto('/my-courses/import');
  await upload(page, polarGeometry);
  await expect(
    page.getByRole('region', { name: '가져온 코스 미리보기 지도' }).getByRole('status'),
  ).toContainText('원본 좌표로 등록할 수 있습니다.');
  await expect(page.locator('.ol-viewport')).toHaveCount(0);
  await expect(page.getByRole('alert')).toHaveCount(0);
  await selectMountain(page);
  await page.getByRole('button', { name: '등록', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(course.courseId));
  expect(submittedGeometry).toEqual(polarGeometry);
});

test('모바일 패널 위에 경로를 맞추고 지도 직접 조작 이후에는 자동 맞춤을 멈춘다', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto('/my-courses/import');
  await upload(page, {
    type: 'LineString',
    coordinates: [
      [126.974, 37.475],
      [126.976, 37.475],
    ],
  });
  const map = page.locator('.orda-map-layout__map-surface');
  const panel = page.getByRole('complementary', { name: '코스 가져오기 입력' });
  async function expectVisibleRoute() {
    await expect
      .poll(async () => {
        const pixels = await routePixelBounds(page);
        const panelBox = await panel.boundingBox();
        const mapBox = await map.boundingBox();
        return Boolean(
          pixels &&
          panelBox &&
          mapBox &&
          pixels.top >= mapBox.y + 20 &&
          pixels.bottom < panelBox.y - 20,
        );
      })
      .toBe(true);
  }
  await expectVisibleRoute();
  const initialCenter = await map.getAttribute('data-map-center');
  await page.getByRole('button', { name: '패널 접기' }).click();
  await expect.poll(() => map.getAttribute('data-map-center')).not.toBe(initialCenter);
  await page.getByRole('button', { name: '패널 펼치기' }).click();
  await expectVisibleRoute();
  await page.setViewportSize({ width: 390, height: 800 });
  await expectVisibleRoute();
  const beforeZoom = Number(await map.getAttribute('data-map-zoom'));
  await page.getByRole('button', { name: '+', exact: true }).click();
  await expect
    .poll(async () => Number(await map.getAttribute('data-map-zoom')))
    .toBeGreaterThan(beforeZoom);
  const zoom = await map.getAttribute('data-map-zoom');
  const center = await map.getAttribute('data-map-center');
  await page.getByRole('button', { name: '패널 접기' }).click();
  await page.setViewportSize({ width: 390, height: 956 });
  await page.getByRole('button', { name: '패널 펼치기' }).click();
  await expect
    .poll(() =>
      map.evaluate(
        (element) =>
          element.dataset.mapSize ===
          `${Math.round(element.clientWidth)}x${Math.round(element.clientHeight)}`,
      ),
    )
    .toBe(true);
  await expect(map).toHaveAttribute('data-map-center', center ?? '');
  await expect(map).toHaveAttribute('data-map-zoom', zoom ?? '');
});

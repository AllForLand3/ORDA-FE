import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures/authenticatedTest';

const geometry = {
  type: 'LineString',
  coordinates: [
    [126.974, 37.475],
    [126.975, 37.475],
    [126.976, 37.475],
  ],
};
const course = {
  courseId: '101',
  mountainId: '1',
  courseName: '경로 편집',
  memo: null,
  createType: 'IMPORT',
  revNo: 1,
  lengthM: 180,
  geometry,
};

async function center(page: Page) {
  const map = page.locator('.orda-map-layout__map-surface');
  await expect(map).toHaveAttribute('data-map-center', '126.975000,37.475000');
  const box = await map.boundingBox();
  if (!box) throw new Error('지도가 표시되지 않았습니다.');
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}
async function drag(page: Page, point: { x: number; y: number }) {
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  await page.mouse.move(point.x + 30, point.y - 40, { steps: 8 });
  await page.mouse.up();
}
test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1512, height: 900 });
  await page.route('https://*.tile.openstreetmap.org/**', (route) => route.abort());
});

test('꼭짓점 이동 후 지도와 확대 수준을 유지하고 초기화하면 원래 경로를 편집한다', async ({
  page,
}) => {
  let body: { geometry?: typeof geometry } = {};
  await page.route('**/api/courses/101', async (route) => {
    if (route.request().method() === 'PATCH') body = route.request().postDataJSON();
    await route.fulfill({ json: { ...course, ...body }, headers: { ETag: '"v1"' } });
  });
  await page.goto('/my-courses/101/edit');
  const point = await center(page);
  const map = page.locator('.orda-map-layout__map-surface');
  const viewport = await page.locator('.ol-viewport').elementHandle();
  const zoom = await map.getAttribute('data-map-zoom');
  await drag(page, point);
  await expect(page.getByRole('button', { name: '저장', exact: true })).toBeEnabled();
  expect(await viewport?.evaluate((node) => node.isConnected)).toBe(true);
  await expect(map).toHaveAttribute('data-map-center', '126.975000,37.475000');
  expect(await map.getAttribute('data-map-zoom')).toBe(zoom);
  await page.getByRole('button', { name: '초기화', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '입력을 초기화할까요?' });
  await expect(dialog).toContainText('이름, 메모, 경로');
  await dialog.getByRole('button', { name: '초기화', exact: true }).click();
  await expect(page.getByRole('button', { name: '저장', exact: true })).toBeDisabled();
  await drag(page, point);
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('코스를 저장했습니다.');
  expect(Object.keys(body)).toEqual(['geometry']);
  expect(body.geometry?.coordinates).toHaveLength(3);
  expect(body.geometry?.coordinates[1][0]).toBeGreaterThan(126.975);
  expect(body.geometry?.coordinates[1][1]).toBeGreaterThan(37.475);
  expect(body.geometry?.coordinates[0][0]).toBeCloseTo(126.974, 8);
  expect(body.geometry?.coordinates[2][0]).toBeCloseTo(126.976, 8);
});

test('저장 실패 시 경로를 유지하고 저장 중에는 선 클릭으로 지점이 추가되지 않는다', async ({
  page,
}) => {
  let release = () => {};
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  const bodies: unknown[] = [];
  await page.route('**/api/courses/101', async (route) => {
    if (route.request().method() === 'PATCH') {
      bodies.push(route.request().postDataJSON());
      if (bodies.length === 1) {
        await pending;
        return route.fulfill({ status: 500, json: { code: 'INTERNAL_SERVER_ERROR' } });
      }
      return route.fulfill({
        json: { ...course, ...route.request().postDataJSON() },
        headers: { ETag: '"v2"' },
      });
    }
    return route.fulfill({ json: course, headers: { ETag: '"v1"' } });
  });
  await page.goto('/my-courses/101/edit');
  const point = await center(page);
  // 선 위의 새 지점을 추가한다.
  await page.mouse.click(point.x + 70, point.y);
  const save = page.getByRole('button', { name: '저장', exact: true });
  await expect(save).toBeEnabled();
  await save.click();
  await expect(page.getByRole('status')).toContainText('경로 편집이 잠깁니다');
  await page.mouse.click(point.x + 120, point.y);
  release();
  await expect(page.getByRole('alert')).toContainText('입력은 유지했습니다');
  await save.click();
  await expect(page.getByRole('status')).toHaveText('코스를 저장했습니다.');
  expect(bodies).toHaveLength(2);
  expect(bodies[1]).toEqual(bodies[0]);
  expect(bodies[0]).toMatchObject({ geometry: { coordinates: expect.any(Array) } });
});

test('꼭짓점을 삭제한 뒤 최신 경로 재조회 중에도 편집을 잠근다', async ({ page }) => {
  let release = () => {};
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  let gets = 0;
  let patches = 0;
  await page.route('**/api/courses/101', async (route) => {
    if (route.request().method() === 'PATCH') {
      patches++;
      expect(route.request().postDataJSON().geometry.coordinates).toHaveLength(2);
      return route.fulfill({ status: 412, json: { code: 'COURSE_EDIT_CONFLICT' } });
    }
    if (++gets > 1) await pending;
    return route.fulfill({ json: course, headers: { ETag: '"v2"' } });
  });
  await page.goto('/my-courses/101/edit');
  const point = await center(page);
  await page.keyboard.down('Alt');
  await page.mouse.click(point.x, point.y);
  await page.keyboard.up('Alt');
  const save = page.getByRole('button', { name: '저장', exact: true });
  await expect(save).toBeEnabled();
  await save.click();
  await page.getByRole('button', { name: '최신 코스 불러오기' }).click();
  const dialog = page.getByRole('dialog', { name: '최신 코스를 불러올까요?' });
  await expect(dialog).toContainText('경로 변경을 버리고');
  await dialog.getByRole('button', { name: '입력 버리고 불러오기' }).click();
  await expect(page.getByRole('status')).toContainText('경로 편집이 잠깁니다');
  await page.mouse.click(point.x + 70, point.y);
  release();
  await expect(page.getByRole('status')).toHaveText('최신 코스를 불러왔습니다.');
  await expect(save).toBeDisabled();
  await drag(page, point);
  await expect(save).toBeEnabled();
  expect(patches).toBe(1);
});

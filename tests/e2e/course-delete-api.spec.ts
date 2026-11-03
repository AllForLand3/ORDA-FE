import { expect, test } from '../fixtures/authenticatedTest';
import { courseListPage } from '../fixtures/courseList';

const course = {
  courseId: '9007199254740993',
  mountainId: '1',
  courseName: '삭제할 코스',
  memo: null,
  createType: 'IMPORT',
  revNo: 1,
  lengthM: 180.4,
  geometry: {
    type: 'LineString',
    coordinates: [
      [126.97, 37.47],
      [126.975, 37.48],
    ],
  },
};
const path = `/my-courses/${course.courseId}`;

test.beforeEach(async ({ page }) => {
  await page.route('https://*.tile.openstreetmap.org/**', (route) => route.abort());
});

test('삭제 확인 취소·Escape는 요청하지 않고 성공 시 갱신된 목록으로 돌아간다', async ({ page }) => {
  let deleted = false;
  let deletes = 0;
  await page.route(/\/api\/courses(?:\?.*)?$/, (route) => {
    expect(route.request().method()).toBe('GET');
    return route.fulfill({
      json: courseListPage(
        deleted
          ? []
          : [
              {
                courseId: course.courseId,
                mountainId: course.mountainId,
                mountainName: '관악산',
                courseName: course.courseName,
                memo: null,
                createType: 'IMPORT',
                lengthM: 180.4,
                estTimeMin: null,
              },
            ],
      ),
    });
  });
  await page.route(`**/api/courses/${course.courseId}`, async (route) => {
    if (route.request().method() === 'DELETE') {
      deletes++;
      expect(route.request().headers()['if-match']).toBe('"v1"');
      expect(route.request().headers().authorization).toBe('Bearer e2e-access-token');
      expect(route.request().postData()).toBeNull();
      deleted = true;
      return route.fulfill({ status: 204 });
    }
    return route.fulfill(
      deleted
        ? { status: 404, json: { code: 'COURSE_NOT_FOUND' } }
        : { json: course, headers: { ETag: '"v1"' } },
    );
  });
  await page.goto('/mountains');
  await page.goto(path);
  const remove = page.getByRole('button', { name: '삭제', exact: true });
  const dialog = page.getByRole('dialog', { name: '코스를 삭제할까요?' });
  await remove.click();
  await expect(dialog).toContainText('삭제할 코스');
  await dialog.getByRole('button', { name: '취소', exact: true }).click();
  await expect(remove).toBeFocused();
  await remove.click();
  await page.keyboard.press('Escape');
  expect(deletes).toBe(0);
  await remove.click();
  await dialog.getByRole('button', { name: '삭제하기', exact: true }).click();
  await expect(page).toHaveURL('/my-courses');
  await expect(page.getByRole('heading', { name: '저장한 코스가 없어요' })).toBeVisible();
  await expect(page.getByRole('article')).toHaveCount(0);
  expect(deletes).toBe(1);
  // 삭제된 상세를 다시 열어도 캐시의 코스를 표시하지 않는다.
  await page.goto(path);
  await expect(page.getByRole('heading', { name: '코스를 찾을 수 없어요' })).toBeVisible();
});

test('500이면 자동 재시도하지 않으며 확인창에서 수동 재시도할 수 있다', async ({ page }) => {
  let deletes = 0;
  await page.route(`**/api/courses/${course.courseId}`, (route) => {
    if (route.request().method() === 'DELETE') {
      deletes++;
      expect(route.request().headers()['if-match']).toBe('"v1"');
      return route.fulfill(
        deletes === 1 ? { status: 500, json: { code: 'INTERNAL_SERVER_ERROR' } } : { status: 204 },
      );
    }
    return route.fulfill({ json: course, headers: { ETag: '"v1"' } });
  });
  await page.goto(path);
  await page.getByRole('button', { name: '삭제', exact: true }).click();
  const confirm = page.getByRole('button', { name: '삭제하기', exact: true });
  await confirm.click();
  await expect(page.getByRole('alert')).toContainText('삭제하지 못했습니다.');
  expect(deletes).toBe(1);
  await page.getByRole('button', { name: '취소', exact: true }).click();
  await page.getByRole('button', { name: '삭제', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await confirm.click();
  await expect(page).toHaveURL(/\/my-courses$/);
  expect(deletes).toBe(2);
});

test('412 후 재조회와 재확인 없이는 최신 ETag로 삭제하지 않는다', async ({ page }) => {
  let gets = 0;
  let deletes = 0;
  await page.route(`**/api/courses/${course.courseId}`, (route) => {
    if (route.request().method() === 'DELETE') {
      deletes++;
      expect(route.request().headers()['if-match']).toBe(deletes === 1 ? '"v1"' : '"v2"');
      return route.fulfill(
        deletes === 1 ? { status: 412, json: { code: 'COURSE_EDIT_CONFLICT' } } : { status: 204 },
      );
    }
    gets++;
    return route.fulfill({
      json: gets === 1 ? course : { ...course, courseName: '변경된 코스' },
      headers: { ETag: gets === 1 ? '"v1"' : '"v2"' },
    });
  });
  await page.goto(path);
  const remove = page.getByRole('button', { name: '삭제', exact: true });
  await remove.click();
  await page.getByRole('button', { name: '삭제하기', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('다른 곳에서 코스가 변경되어');
  expect(gets).toBe(1);
  await page.getByRole('button', { name: '취소', exact: true }).click();
  await remove.click();
  await expect(page.getByRole('button', { name: '삭제하기', exact: true })).toHaveCount(0);
  await expect(page.getByRole('alert')).toContainText('다른 곳에서 코스가 변경되어');
  await page.getByRole('button', { name: '최신 코스 확인' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('변경된 코스');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  expect(deletes).toBe(1);
  await remove.click();
  await expect(page.getByRole('dialog')).toContainText('변경된 코스');
  await page.getByRole('button', { name: '삭제하기', exact: true }).click();
  await expect(page).toHaveURL(/\/my-courses$/);
  expect(deletes).toBe(2);
});

test('삭제 처리 중 중복 확인과 Escape를 막는다', async ({ page }) => {
  let complete: () => void = () => {};
  const pending = new Promise<void>((resolve) => {
    complete = resolve;
  });
  let deletes = 0;
  await page.route(`**/api/courses/${course.courseId}`, async (route) => {
    if (route.request().method() === 'DELETE') {
      deletes++;
      await pending;
      return route.fulfill({ status: 204 });
    }
    return route.fulfill({ json: course, headers: { ETag: '"v1"' } });
  });
  await page.goto(path);
  await page.getByRole('button', { name: '삭제', exact: true }).click();
  await page.getByRole('button', { name: '삭제하기', exact: true }).click();
  await expect(page.getByRole('button', { name: '삭제하기', exact: true })).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeVisible();
  complete();
  await expect(page).toHaveURL(/\/my-courses$/);
  expect(deletes).toBe(1);
});

test('ETag가 없으면 삭제할 수 없고 404를 성공으로 표시하지 않는다', async ({ page }) => {
  let gets = 0;
  let deletes = 0;
  await page.route(`**/api/courses/${course.courseId}`, (route) => {
    if (route.request().method() === 'DELETE') {
      deletes++;
      return route.fulfill({ status: 404, json: { code: 'COURSE_NOT_FOUND' } });
    }
    gets++;
    return route.fulfill({ json: course, headers: gets === 1 ? {} : { ETag: '"v1"' } });
  });
  await page.goto(path);
  await expect(page.getByRole('button', { name: '삭제', exact: true })).toBeDisabled();
  expect(deletes).toBe(0);
  await page.getByRole('button', { name: '상세 다시 조회' }).click();
  await page.getByRole('button', { name: '삭제', exact: true }).click();
  await page.getByRole('button', { name: '삭제하기', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText(
    '코스가 이미 삭제되었거나 접근할 수 없습니다.',
  );
  await expect(page).toHaveURL(new RegExp(course.courseId));
  expect(deletes).toBe(1);
});

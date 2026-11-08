import { expect, test } from '../fixtures/authenticatedTest';
import { courseListDetail, courseListItems, courseListPage } from '../fixtures/courseList';

const collection = /\/api\/courses(?:\?.*)?$/;
const courses = Array.from({ length: 19 }, (_, index) => ({
  ...courseListItems[0],
  courseId: String(500 + index),
  courseName: '페이지 코스 ' + (index + 1),
}));

test.beforeEach(async ({ page }) => {
  await page.route('https://*.tile.openstreetmap.org/**', (route) => route.abort());
});

for (const count of [0, 9, 10, 18, 19]) {
  test(count + '개 코스를 페이지당 최대 9개 표시하고 전체 개수를 유지한다', async ({ page }) => {
    await page.route(collection, (route) => {
      const url = new URL(route.request().url());
      expect(url.searchParams.has('size')).toBe(false);
      const current = Number(url.searchParams.get('page'));
      return route.fulfill({
        json: courseListPage(
          courses.slice(current * 9, Math.min(count, (current + 1) * 9)),
          current,
          count,
        ),
      });
    });
    await page.goto('/my-courses');
    await expect(page.getByRole('article')).toHaveCount(Math.min(count, 9));
    await expect(page.locator('.my-courses-toolbar')).toHaveText('전체 ' + count);
    const navigation = page.getByRole('navigation', { name: '코스 목록 페이지' });
    if (count <= 9) {
      await expect(navigation).toHaveCount(0);
      return;
    }
    await expect(navigation.getByRole('button', { name: '이전 페이지' })).toBeDisabled();
    for (let current = 1; current < Math.ceil(count / 9); current++) {
      await navigation.getByRole('button', { name: '다음 페이지' }).click();
      await expect(page).toHaveURL('/my-courses?page=' + current);
      await expect(page.getByRole('article')).toHaveCount(Math.min(9, count - current * 9));
      await expect(page.getByRole('article').first()).toHaveAccessibleName(
        courses[current * 9].courseName,
      );
    }
    await expect(navigation.getByRole('button', { name: '다음 페이지' })).toBeDisabled();
    await expect(page.locator('.my-courses-toolbar')).toHaveText('전체 ' + count);
  });
}

test('새로고침·브라우저 이력과 상세·편집 복귀에서 페이지를 유지한다', async ({ page }) => {
  await page.route(collection, (route) => {
    const current = Number(new URL(route.request().url()).searchParams.get('page'));
    return route.fulfill({
      json: courseListPage(courses.slice(current * 9, current * 9 + 9), current, 19),
    });
  });
  const selected = courses[9];
  await page.route('**/api/courses/' + selected.courseId, (route) =>
    route.fulfill({
      json: { ...courseListDetail, courseId: selected.courseId, courseName: selected.courseName },
      headers: { ETag: '"v1"' },
    }),
  );
  await page.goto('/my-courses');
  await page.getByRole('button', { name: '다음 페이지' }).click();
  await expect(page.getByRole('article').first()).toHaveAccessibleName(selected.courseName);
  await page.reload();
  await expect(page.getByRole('article').first()).toHaveAccessibleName(selected.courseName);
  await page.goBack();
  await expect(page.getByRole('article').first()).toHaveAccessibleName(courses[0].courseName);
  await page.goForward();
  await expect(page.getByRole('article').first()).toHaveAccessibleName(selected.courseName);
  await page
    .getByRole('article')
    .first()
    .getByRole('link', { name: '코스 상세 보기', exact: true })
    .click();
  await expect(page).toHaveURL('/my-courses/' + selected.courseId + '?listPage=1');
  await page.getByRole('link', { name: '내 코스 목록으로', exact: true }).click();
  await expect(page).toHaveURL('/my-courses?page=1');
  await page.getByRole('article').first().getByRole('link', { name: '편집', exact: true }).click();
  await expect(page).toHaveURL('/my-courses/' + selected.courseId + '/edit?listPage=1');
  await page.getByRole('link', { name: '취소', exact: true }).click();
  await page.getByRole('link', { name: '내 코스 목록으로', exact: true }).click();
  await expect(page).toHaveURL('/my-courses?page=1');
  await expect(page.getByRole('article').first()).toHaveAccessibleName(selected.courseName);
});

for (const total of [0, 19]) {
  test(
    '범위를 벗어난 페이지를 마지막 유효 페이지로 보정한다: ' + total + '개',
    async ({ page }) => {
      const requests: number[] = [];
      await page.route(collection, (route) => {
        const current = Number(new URL(route.request().url()).searchParams.get('page'));
        requests.push(current);
        return route.fulfill({
          json: courseListPage(
            courses.slice(current * 9, Math.min(total, current * 9 + 9)),
            current,
            total,
          ),
        });
      });
      await page.goto('/my-courses?page=999');
      const last = total === 0 ? 0 : 2;
      await expect(page).toHaveURL('/my-courses?page=' + last);
      if (total) await expect(page.getByRole('article')).toHaveCount(1);
      else await expect(page.getByRole('heading', { name: '저장한 코스가 없어요' })).toBeVisible();
      expect(requests).toEqual([999, last]);
    },
  );
}

for (const invalid of ['-1', 'abc', '1.2', '2147483648']) {
  test('잘못된 URL 페이지를 첫 페이지로 보정한다: ' + invalid, async ({ page }) => {
    await page.route(collection, (route) => {
      expect(new URL(route.request().url()).searchParams.get('page')).toBe('0');
      return route.fulfill({ json: courseListPage() });
    });
    await page.goto('/my-courses?page=' + invalid);
    await expect(page).toHaveURL('/my-courses?page=0');
    await expect(page.getByRole('article')).toHaveCount(2);
  });
}

test('페이지 오류를 빈 목록과 구분하고 재시도 및 이전 페이지 이동을 제공한다', async ({ page }) => {
  let failed = true;
  await page.route(collection, (route) => {
    const current = Number(new URL(route.request().url()).searchParams.get('page'));
    if (current === 1 && failed)
      return route.fulfill({ status: 503, json: { code: 'INTERNAL_SERVER_ERROR' } });
    return route.fulfill({
      json: courseListPage(courses.slice(current * 9, current * 9 + 9), current, 19),
    });
  });
  await page.goto('/my-courses?page=1');
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('article')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '이전 페이지' })).toBeEnabled();
  await expect(page.getByRole('button', { name: '다음 페이지' })).toBeDisabled();
  failed = false;
  await page.getByRole('button', { name: '다시 시도', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(9);
  await page.getByRole('button', { name: '이전 페이지' }).click();
  await expect(page).toHaveURL('/my-courses?page=0');
  await expect(page.getByRole('article').first()).toHaveAccessibleName(courses[0].courseName);
});

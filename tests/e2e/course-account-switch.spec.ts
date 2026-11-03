import { authenticatedUser, expect, test } from '../fixtures/authenticatedTest';
import { courseListDetail, courseListItems } from '../fixtures/courseList';

for (const screen of ['list', 'detail', 'edit'] as const) {
  test(`다른 탭에서 계정이 바뀌면 ${screen}의 이전 계정 자료를 숨기고 새 토큰으로 조회한다`, async ({
    page,
    context,
  }) => {
    let releaseAuthentication = () => {};
    const authentication = new Promise<void>((resolve) => {
      releaseAuthentication = resolve;
    });
    const newToken = 'second-account-token';
    let newCourseRequests = 0;
    await page.route('https://*.tile.openstreetmap.org/**', (route) => route.abort());
    await page.route('**/api/auth/me', async (route) => {
      const changed = route.request().headers().authorization === `Bearer ${newToken}`;
      if (changed) await authentication;
      await route.fulfill({
        json: changed
          ? { ...authenticatedUser, userId: '2', nickname: '다음 사용자' }
          : authenticatedUser,
      });
    });
    await page.route('**/api/courses', (route) => {
      const changed = route.request().headers().authorization === `Bearer ${newToken}`;
      if (changed) newCourseRequests++;
      return route.fulfill({
        json: [
          { ...courseListItems[0], courseName: changed ? '다음 계정 코스' : '이전 계정 코스' },
        ],
      });
    });
    await page.route(`**/api/courses/${courseListDetail.courseId}`, (route) => {
      const changed = route.request().headers().authorization === `Bearer ${newToken}`;
      if (changed) newCourseRequests++;
      return route.fulfill({
        json: {
          ...courseListDetail,
          courseName: changed ? '다음 계정 코스' : '이전 계정 코스',
          memo: changed ? '다음 계정 메모' : '이전 계정 메모',
        },
        headers: { ETag: changed ? '"new-account"' : '"old-account"' },
      });
    });
    const path =
      screen === 'list'
        ? '/my-courses'
        : `/my-courses/${courseListDetail.courseId}${screen === 'edit' ? '/edit' : ''}`;
    await page.goto(path);
    if (screen === 'edit') {
      await expect(page.getByRole('textbox', { name: '코스 이름', exact: true })).toHaveValue(
        '이전 계정 코스',
      );
      await page
        .getByRole('textbox', { name: '코스 이름', exact: true })
        .fill('이전 계정의 미저장 입력');
    } else {
      await expect(
        page.getByRole('heading', { name: '이전 계정 코스', exact: true }),
      ).toBeVisible();
    }
    const otherTab = await context.newPage();
    await otherTab.route('**/api/auth/me', (route) => route.fulfill({ json: authenticatedUser }));
    try {
      await otherTab.goto('/not-a-real-page');
      await otherTab.evaluate((token) => localStorage.setItem('orda.accessToken', token), newToken);
      await expect(page.getByRole('heading', { name: '로그인 상태 확인 중' })).toBeVisible();
      await expect(page.getByRole('heading', { name: '이전 계정 코스', exact: true })).toHaveCount(
        0,
      );
      await expect(page.getByRole('textbox', { name: '코스 이름', exact: true })).toHaveCount(0);
      releaseAuthentication();
      if (screen === 'edit') {
        await expect(page.getByRole('textbox', { name: '코스 이름', exact: true })).toHaveValue(
          '다음 계정 코스',
        );
        await expect(page.getByRole('textbox', { name: '메모', exact: true })).toHaveValue(
          '다음 계정 메모',
        );
        await expect(page.getByRole('button', { name: '저장', exact: true })).toBeDisabled();
      } else {
        await expect(
          page.getByRole('heading', { name: '다음 계정 코스', exact: true }),
        ).toBeVisible();
      }
      expect(newCourseRequests).toBeGreaterThan(0);
      await expect(page.getByRole('dialog')).toHaveCount(0);
    } finally {
      releaseAuthentication();
      await otherTab.close();
    }
  });
}

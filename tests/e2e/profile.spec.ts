import { expect, isDomainApiRequest, test } from '../fixtures/authenticatedTest';

test('마이페이지는 로그인 사용자 정보를 표시하고 로그아웃한다', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (request) => {
    if (isDomainApiRequest(request.url())) requests.push(request.url());
  });
  await page.setViewportSize({ width: 440, height: 956 });
  await page.goto('/mountains');
  await page.getByRole('link', { name: '마이페이지로 이동' }).click();
  await expect(page).toHaveURL('/my-page');
  await expect(page.getByRole('heading', { name: '마이페이지', exact: true })).toBeVisible();
  await expect(page.getByText('테스트 사용자', { exact: true })).toBeVisible();
  await expect(page.getByText('e2e-user', { exact: true })).toBeVisible();
  await expect(page.getByText('다운로드 파일')).toHaveCount(0);
  await expect(page.getByText('앱 설정')).toHaveCount(0);
  await page.getByRole('link', { name: '내 정보 수정', exact: false }).click();
  await expect(page).toHaveURL('/my-page/edit');
  await expect(page.getByLabel('닉네임', { exact: true })).toHaveValue('테스트 사용자');
  await expect(page.getByLabel('아이디', { exact: true })).toHaveValue('e2e-user');
  await expect(page.getByLabel('아이디', { exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: '저장', exact: true })).toBeDisabled();
  await expect(page.getByText(/프로필 수정 API 연결 후/)).toBeVisible();
  await page.getByLabel('닉네임', { exact: true }).fill('변경한 닉네임');
  await page.getByRole('link', { name: '마이페이지로 돌아가기', exact: true }).click();
  const leave = page.getByRole('dialog', { name: '내 정보 수정을 나갈까요?' });
  await expect(leave).toBeVisible();
  await leave.getByRole('button', { name: '계속 수정하기' }).click();
  await expect(page.getByLabel('닉네임', { exact: true })).toHaveValue('변경한 닉네임');
  await page.goBack();
  await leave.getByRole('button', { name: '나가기', exact: true }).click();
  await expect(page).toHaveURL('/my-page');
  await page.getByRole('link', { name: '내 정보 수정', exact: false }).click();
  await expect(page.getByLabel('닉네임', { exact: true })).toHaveValue('테스트 사용자');
  await page.reload();
  await expect(page.getByRole('heading', { name: '내 정보 수정', exact: true })).toBeVisible();
  await page.getByRole('link', { name: '마이페이지로 돌아가기', exact: true }).click();
  await page.getByRole('button', { name: '로그아웃' }).click();
  await expect(page).toHaveURL('/');
  await expect
    .poll(() =>
      page.evaluate(() => ({
        localToken: localStorage.getItem('orda.accessToken'),
        sessionToken: sessionStorage.getItem('orda.accessToken'),
      })),
    )
    .toEqual({ localToken: null, sessionToken: null });
  expect(requests).toEqual([]);
});

test('모바일·PC 내비게이션은 구현된 화면을 연결하고 404를 유지한다', async ({ page }) => {
  for (const width of [390, 1024]) {
    await page.setViewportSize({ width, height: 956 });
    await page.goto('/my-courses');
    await page.getByRole('link', { name: '마이페이지', exact: true }).click();

    if (width >= 768) {
      const myCoursesButton = page.getByRole('link', { name: '내 코스', exact: true });
      const myPageButton = page.getByRole('link', { name: '마이페이지', exact: true });
      const defaultStyles = await Promise.all(
        [myCoursesButton, myPageButton].map((button) =>
          button.evaluate((element) => {
            const style = getComputedStyle(element);
            return {
              backgroundColor: style.backgroundColor,
              borderColor: style.borderColor,
              color: style.color,
            };
          }),
        ),
      );

      expect(defaultStyles[0]).toEqual(defaultStyles[1]);
      await myCoursesButton.hover();
      await expect
        .poll(() =>
          myCoursesButton.evaluate((element) => getComputedStyle(element).backgroundColor),
        )
        .not.toBe(defaultStyles[0].backgroundColor);
    }

    if (width < 768) {
      await page
        .getByRole('navigation', { name: '내 코스 내비게이션' })
        .getByRole('link', { name: '산 탐색' })
        .click();
    } else {
      await page.goBack();
      await page.getByRole('link', { name: 'ORDA 산 탐색으로 이동' }).click();
    }

    await expect(page).toHaveURL('/mountains');

    if (width < 768) {
      await page.getByRole('link', { name: '맞춤 경로', exact: true }).click();
      await expect(page).toHaveURL('/routes/setup');
    }

    await page.goto('/routes/results');
    await page.getByRole('link', { name: '마이페이지로 이동' }).click();
    await expect(page).toHaveURL('/my-page');

    if (width < 768) {
      await page
        .getByRole('navigation', { name: '내 코스 내비게이션' })
        .getByRole('link', { name: '맞춤 경로' })
        .click();
    } else {
      await page.goto('/routes/setup');
    }

    await expect(page).toHaveURL(/\/routes\/setup(?:\?.*)?$/);
    await page.goto('/not-a-real-page');
    await expect(page.getByRole('heading', { name: '페이지를 찾을 수 없습니다.' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('link', { name: '홈으로 돌아가기' })).toHaveAttribute('href', '/');
    await page.getByRole('link', { name: '홈으로 돌아가기' }).click();
    await expect(page).toHaveURL('/mountains');
  }
});

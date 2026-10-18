import { expect, test } from '@playwright/test';

test('마이페이지는 예시 프로필과 미연결 메뉴를 표시하고 서버 로그아웃을 가장하지 않는다', async ({
  page,
}) => {
  const requests: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/api/')) requests.push(request.url());
  });
  await page.setViewportSize({ width: 440, height: 956 });
  await page.goto('/mountains');
  await page.getByRole('link', { name: '마이페이지로 이동' }).click();
  await expect(page).toHaveURL('/my-page');
  await expect(page.getByRole('heading', { name: '마이페이지', exact: true })).toBeVisible();
  await expect(page.getByText('orda@example.com', { exact: true })).toBeVisible();
  await expect(page.getByText('예시 프로필입니다.', { exact: false })).toBeVisible();
  for (const [buttonName, title] of [
    ['다운로드 파일', '다운로드 파일 준비 중'],
    ['앱 설정', '앱 설정 준비 중'],
    ['로그아웃', '로그아웃 미연결'],
  ]) {
    const trigger = page.getByRole('button', { name: new RegExp(buttonName) });
    await trigger.focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog', { name: title });
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
    await expect(page).toHaveURL('/my-page');
  }
  await page.getByRole('link', { name: '내 정보 수정', exact: false }).click();
  await expect(page).toHaveURL('/my-page/edit');
  await expect(page.getByLabel('이름', { exact: true })).toHaveValue('오르다');
  await expect(page.getByLabel('이메일', { exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: '저장', exact: true })).toBeDisabled();
  await expect(page.getByText(/추가 입력 항목은 아직 확정되지 않았습니다/)).toBeVisible();
  await page.getByLabel('이름', { exact: true }).fill('저장 안 되는 예시');
  await page.getByRole('link', { name: '내 정보 수정', exact: true }).click();
  const leave = page.getByRole('dialog', { name: '내 정보 수정을 나갈까요?' });
  await expect(leave).toBeVisible();
  await leave.getByRole('button', { name: '계속 보기' }).click();
  await expect(page.getByLabel('이름', { exact: true })).toHaveValue('저장 안 되는 예시');
  await page.goBack();
  await leave.getByRole('button', { name: '입력 버리고 나가기' }).click();
  await expect(page).toHaveURL('/my-page');
  await page.getByRole('link', { name: '내 정보 수정', exact: false }).click();
  await expect(page.getByLabel('이름', { exact: true })).toHaveValue('오르다');
  await page.reload();
  await expect(page.getByRole('heading', { name: '내 정보 수정', exact: true })).toBeVisible();
  expect(requests).toEqual([]);
});

test('모바일·PC 내비게이션은 구현된 화면을 연결하고 404를 유지한다', async ({ page }) => {
  for (const width of [390, 1024]) {
    await page.setViewportSize({ width, height: 956 });
    await page.goto('/my-courses');
    await page.getByRole('link', { name: '마이페이지', exact: true }).click();
    await page
      .getByRole('navigation', { name: '내 코스 내비게이션' })
      .getByRole('link', { name: '산 탐색' })
      .click();
    if (width < 768) {
      await page.getByRole('link', { name: '맞춤 경로', exact: true }).click();
      await expect(page).toHaveURL('/routes/setup');
    }
    await page.goto('/routes/results');
    await page.getByRole('link', { name: '마이페이지', exact: true }).click();
    await expect(page).toHaveURL('/my-page');
    await page
      .getByRole('navigation', { name: '내 코스 내비게이션' })
      .getByRole('link', { name: '맞춤 경로' })
      .click();
    await expect(page).toHaveURL('/routes/setup');
    await page.goto('/not-a-real-page');
    await expect(page.getByRole('heading', { name: '페이지를 찾을 수 없습니다.' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('link', { name: '홈으로 돌아가기' })).toHaveAttribute('href', '/');
    await page.getByRole('link', { name: '홈으로 돌아가기' }).click();
    await expect(page).toHaveURL('/');
  }
});

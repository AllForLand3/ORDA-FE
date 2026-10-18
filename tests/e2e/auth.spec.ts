import { expect, test } from '@playwright/test';

test('로그인 UI는 직접 접근·키보드·입력 검증을 지원하고 인증 성공을 가장하지 않는다', async ({
  page,
}) => {
  await page.setViewportSize({ width: 440, height: 956 });
  const apiRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/')) apiRequests.push(request.url());
  });

  await page.goto('/login');
  await expect(page.getByRole('heading', { name: '로그인' })).toBeVisible();
  await expect(page.getByText('9:41')).toHaveCount(0);

  const email = page.getByLabel('이메일');
  const password = page.locator('#login-password');
  await email.focus();
  await page.keyboard.press('Tab');
  await expect(password).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: '비밀번호 표시' })).toBeFocused();

  await email.fill('not-an-email');
  await password.fill('password');
  await page.getByRole('button', { name: '로그인하기' }).click();
  await expect(email).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByText('올바른 이메일 주소를 입력해주세요.')).toBeVisible();

  await email.fill('hiker@example.com');
  await expect(email).toBeFocused();
  await page.getByRole('button', { name: '비밀번호 표시' }).click();
  await expect(password).toHaveAttribute('type', 'text');
  await page.getByRole('button', { name: '비밀번호 숨기기' }).click();
  await expect(password).toHaveAttribute('type', 'password');

  await page.getByRole('button', { name: '로그인하기' }).click();
  await expect(
    page.getByRole('status').getByText('인증 서버가 연결되지 않아 로그인되지 않았습니다.'),
  ).toBeVisible();
  expect(apiRequests).toHaveLength(0);

  await page.getByRole('link', { name: '회원가입하기' }).click();
  await expect(page).toHaveURL('/signup');
  await page.goBack();
  await expect(page).toHaveURL('/login');
});

test('회원가입은 입력·약관 동의 전 비활성이고 실제 계정을 만들지 않는다', async ({ page }) => {
  await page.setViewportSize({ width: 440, height: 956 });
  const apiRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/')) apiRequests.push(request.url());
  });

  await page.goto('/signup');
  await expect(page.getByRole('heading', { name: '회원가입' })).toBeVisible();

  const submit = page.getByRole('button', { name: '회원가입하기' });
  await expect(submit).toBeDisabled();
  await expect(page.locator('#signup-password')).toHaveAttribute('aria-invalid', 'true');

  await page.getByLabel('이메일').fill('hiker@example.com');
  await page.locator('#signup-password').fill('Hiking!2026');
  await page.getByLabel('비밀번호 확인').fill('Hiking!2026');
  await page.getByLabel('닉네임').fill('산친구');
  await page.getByRole('checkbox', { name: /서비스 이용약관/ }).check();
  await page.getByRole('checkbox', { name: /개인정보 수집 및 이용/ }).check();
  await expect(submit).toBeEnabled();

  const password = page.getByLabel('비밀번호', { exact: true });
  await page.getByRole('button', { name: '비밀번호 표시' }).first().click();
  await expect(password).toHaveAttribute('type', 'text');
  await submit.click();
  await expect(
    page.getByRole('status').getByText('인증 서버가 연결되지 않아 계정이 생성되지 않았습니다.'),
  ).toBeVisible();
  expect(apiRequests).toHaveLength(0);

  await page.getByRole('link', { name: '로그인하기' }).click();
  await expect(page).toHaveURL('/login');
});

test('인증 화면은 모바일과 데스크톱 폭에서 가로 넘침 없이 중앙 배치된다', async ({ page }) => {
  for (const width of [360, 390, 440, 768, 1024, 1512]) {
    await page.setViewportSize({ width, height: width < 768 ? 956 : 982 });

    for (const path of ['/login', '/signup']) {
      await page.goto(path);
      const layout = await page.evaluate(() => {
        const pageElement = document.querySelector('.auth-page');
        const rect = pageElement?.getBoundingClientRect();
        return {
          documentWidth: document.documentElement.scrollWidth,
          pageLeft: rect?.left ?? -1,
          pageWidth: rect?.width ?? 0,
        };
      });

      expect(layout.documentWidth).toBeLessThanOrEqual(width);
      expect(layout.pageWidth).toBeLessThanOrEqual(440);
      expect(layout.pageLeft).toBeGreaterThanOrEqual(0);
    }
  }
});

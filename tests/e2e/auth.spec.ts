import { expect, test } from '@playwright/test';

test('로그인 성공 시 토큰을 저장하고 원래 요청한 보호 화면으로 이동한다', async ({ page }) => {
  await page.setViewportSize({ width: 440, height: 956 });
  let loginAuthorization: string | undefined;
  await page.route('**/api/auth/login', async (route) => {
    const request = route.request();
    expect(request.postDataJSON()).toEqual({ loginId: 'orda-user', password: 'password' });
    loginAuthorization = request.headers().authorization;
    await route.fulfill({
      json: {
        accessToken: 'issued-access-token',
        tokenType: 'Bearer',
        userId: '1',
        loginId: 'orda-user',
        nickname: '오르다',
        role: 'USER',
      },
    });
  });
  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({
      json: {
        userId: '1',
        loginId: 'orda-user',
        nickname: '오르다',
        role: 'USER',
      },
    });
  });

  await page.goto('/my-page');
  await expect(page).toHaveURL(/\/login\?redirect=%2Fmy-page$/);
  await expect(page.getByRole('heading', { name: '로그인' })).toBeVisible();
  await expect(page.getByText('9:41')).toHaveCount(0);

  const loginId = page.getByLabel('아이디');
  const password = page.locator('#login-password');
  await loginId.focus();
  await page.keyboard.press('Tab');
  await expect(password).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: '비밀번호 표시' })).toBeFocused();

  await loginId.fill('orda-user');
  await password.fill('password');
  await page.getByRole('button', { name: '비밀번호 표시' }).click();
  await expect(password).toHaveAttribute('type', 'text');
  await page.getByRole('button', { name: '비밀번호 숨기기' }).click();
  await expect(password).toHaveAttribute('type', 'password');

  await page.getByRole('button', { name: 'Google로 로그인' }).click();
  await expect(page.getByRole('status')).toContainText(
    'Google 로그인 기능은 아직 연결되지 않았습니다.',
  );
  await page.getByRole('button', { name: '비밀번호 찾기' }).click();
  await expect(page.getByRole('status')).toContainText(
    '비밀번호 찾기 기능은 아직 연결되지 않았습니다.',
  );
  await page.getByRole('button', { name: '로그인하기' }).click();
  await expect(page).toHaveURL('/my-page');
  await expect(page.getByText('오르다', { exact: true })).toBeVisible();
  expect(loginAuthorization).toBeUndefined();
  expect(
    await page.evaluate(() => ({
      localToken: localStorage.getItem('orda.accessToken'),
      sessionToken: sessionStorage.getItem('orda.accessToken'),
    })),
  ).toEqual({ localToken: 'issued-access-token', sessionToken: null });

  await page.goto('/login');
  await expect(page).toHaveURL('/mountains');
});

test('로그인 실패 시 서버 오류 메시지를 사용자 안내로 변환한다', async ({ page }) => {
  await page.route('**/api/auth/login', async (route) => {
    await route.fulfill({
      status: 401,
      json: {
        status: 401,
        code: 'UNAUTHORIZED',
        message: '인증이 필요합니다.',
      },
    });
  });

  await page.goto('/login');
  await page.getByLabel('아이디').fill('wrong-user');
  await page.locator('#login-password').fill('wrong-password');
  await page.getByRole('button', { name: '로그인하기' }).click();

  await expect(page.getByRole('status')).toHaveText('아이디 또는 비밀번호를 확인해주세요.');
  await expect(page).toHaveURL('/login');
  expect(await page.evaluate(() => localStorage.getItem('orda.accessToken'))).toBeNull();
});

test('만료된 저장 토큰은 제거하고 로그인 화면으로 이동한다', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('orda.accessToken', 'expired-token'));
  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({
      status: 401,
      json: {
        status: 401,
        code: 'UNAUTHORIZED',
        message: '인증이 필요합니다.',
      },
    });
  });

  await page.goto('/mountains');
  await expect(page).toHaveURL(/\/login\?redirect=%2Fmountains$/);
  expect(await page.evaluate(() => localStorage.getItem('orda.accessToken'))).toBeNull();
});

test('회원가입은 입력·약관 동의 전 비활성이고 실제 계정을 만들지 않는다', async ({ page }) => {
  await page.setViewportSize({ width: 440, height: 956 });
  const apiRequests: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/api/')) apiRequests.push(request.url());
  });

  await page.goto('/signup');
  await expect(page.getByRole('heading', { name: '회원가입' })).toBeVisible();

  const submit = page.getByRole('button', { name: '회원가입하기' });
  await expect(submit).toBeDisabled();
  await expect(page.locator('#signup-password')).toHaveAttribute('aria-invalid', 'true');

  await page.getByLabel('이메일').fill('hiker@example.com');
  await page.locator('#signup-password').fill('Hiking!2026');
  await page.locator('#signup-passwordConfirm').fill('Hiking!2026');
  await page.getByLabel('닉네임').fill('산친구');
  await page.getByRole('checkbox', { name: /서비스 이용약관/ }).check();
  await page.getByRole('checkbox', { name: /개인정보 수집 및 이용/ }).check();
  await expect(submit).toBeEnabled();

  const password = page.getByLabel('비밀번호', { exact: true });
  const passwordConfirm = page.getByLabel('비밀번호 확인', { exact: true });
  await page.getByRole('button', { name: '비밀번호 표시', exact: true }).click();
  await expect(password).toHaveAttribute('type', 'text');
  await page.getByRole('button', { name: '비밀번호 확인 표시', exact: true }).click();
  await expect(passwordConfirm).toHaveAttribute('type', 'text');
  await submit.click();
  await expect(
    page.getByRole('status').getByText('인증 서버가 연결되지 않아 계정이 생성되지 않았습니다.'),
  ).toBeVisible();
  expect(apiRequests).toHaveLength(0);

  await page.getByRole('link', { name: '로그인하기' }).click();
  await expect(page).toHaveURL('/login');
});

test('인증 화면은 모바일 카드와 데스크톱 분할 레이아웃을 제공한다', async ({ page }) => {
  for (const width of [360, 390, 440, 768, 1024, 1440, 1512]) {
    await page.setViewportSize({ width, height: width < 768 ? 956 : 982 });

    for (const path of ['/login', '/signup']) {
      await page.goto(path);
      const layout = await page.evaluate(() => {
        const pageElement = document.querySelector('.auth-page');
        const brandElement = document.querySelector('.auth-login__brand, .auth-signup__heading');
        const surfaceElement = document.querySelector('.auth-surface');
        const rect = pageElement?.getBoundingClientRect();
        const brandRect = brandElement?.getBoundingClientRect();
        const surfaceRect = surfaceElement?.getBoundingClientRect();
        return {
          documentWidth: document.documentElement.scrollWidth,
          pageLeft: rect?.left ?? -1,
          pageWidth: rect?.width ?? 0,
          brandRight: brandRect?.right ?? 0,
          surfaceLeft: surfaceRect?.left ?? 0,
        };
      });

      expect(layout.documentWidth).toBeLessThanOrEqual(width);
      expect(layout.pageLeft).toBeGreaterThanOrEqual(0);
      if (width >= 1024) {
        expect(layout.pageWidth).toBeGreaterThan(800);
        expect(layout.surfaceLeft).toBeGreaterThanOrEqual(layout.brandRight - 1);
      } else {
        expect(layout.pageWidth).toBeLessThanOrEqual(440);
      }

      if (width === 1512) {
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({
          path: `test-results/auth-${path.slice(1)}-desktop.png`,
          animations: 'disabled',
        });
      }
    }
  }

  await page.setViewportSize({ width: 1512, height: 982 });
  const desktopFrames = [];
  for (const path of ['/login', '/signup']) {
    await page.goto(path);
    desktopFrames.push(
      await page.locator('.auth-page').evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      }),
    );
  }
  expect(desktopFrames[0]).toEqual(desktopFrames[1]);
});

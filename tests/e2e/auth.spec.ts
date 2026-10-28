import { expect, test } from '@playwright/test';

const mockUser = {
  userId: '1',
  loginId: 'orda-user',
  nickname: '오르다',
  role: 'USER',
};

test('로그인 성공 시 토큰을 저장하고 산 목록 화면으로 이동한다', async ({ page }) => {
  await page.setViewportSize({ width: 440, height: 956 });

  let loginAuthorization: string | undefined;

  await page.route('**/api/auth/login', async (route) => {
    const request = route.request();

    expect(request.postDataJSON()).toEqual({
      loginId: 'orda-user',
      password: 'password',
    });

    loginAuthorization = request.headers().authorization;

    await route.fulfill({
      json: {
        accessToken: 'issued-access-token',
        tokenType: 'Bearer',
        ...mockUser,
      },
    });
  });

  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({ json: mockUser });
  });

  await page.goto('/my-page');

  await expect(page).toHaveURL(/\/login\?redirect=%2Fmy-page$/);
  await expect(page.getByRole('heading', { name: '로그인' })).toBeVisible();

  const loginId = page.getByLabel('아이디');
  const password = page.locator('#login-password');

  await loginId.focus();
  await page.keyboard.press('Tab');
  await expect(password).toBeFocused();

  await loginId.fill('orda-user');
  await password.fill('password');

  await page.getByRole('button', { name: '비밀번호 표시' }).click();
  await expect(password).toHaveAttribute('type', 'text');

  await page.getByRole('button', { name: '비밀번호 숨기기' }).click();
  await expect(password).toHaveAttribute('type', 'password');

  await page.getByRole('button', { name: '로그인하기' }).click();

  // 로그인 성공 후 redirect보다 /mountains를 우선한다.
  await expect(page).toHaveURL('/mountains');

  expect(loginAuthorization).toBeUndefined();

  expect(
    await page.evaluate(() => ({
      localToken: localStorage.getItem('orda.accessToken'),
      sessionToken: sessionStorage.getItem('orda.accessToken'),
    })),
  ).toEqual({
    localToken: 'issued-access-token',
    sessionToken: null,
  });
});

test('로그인 실패 시 아이디와 비밀번호 필드에 오류를 표시한다', async ({ page }) => {
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

  const loginId = page.getByLabel('아이디');
  const password = page.locator('#login-password');

  await loginId.fill('wrong-user');
  await password.fill('wrong-password');

  await page.getByRole('button', { name: '로그인하기' }).click();

  await expect(loginId).toHaveAttribute('aria-invalid', 'true');
  await expect(password).toHaveAttribute('aria-invalid', 'true');

  await expect(page.getByText('아이디 또는 비밀번호를 확인해주세요.')).toBeVisible();
  await expect(page).toHaveURL('/login');

  expect(await page.evaluate(() => localStorage.getItem('orda.accessToken'))).toBeNull();
});

test('만료된 저장 토큰은 제거하고 로그인 화면으로 이동한다', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('orda.accessToken', 'expired-token');
  });

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

test('회원가입은 유효성 검증과 약관 동의 후 API를 호출한다', async ({ page }) => {
  await page.setViewportSize({ width: 440, height: 956 });

  let signupRequest: { loginId: string; nickname: string; password: string } | undefined;

  let signupAuthorization: string | undefined;
  let signupRequestCount = 0;

  await page.route('**/api/users/signup', async (route) => {
    signupRequestCount += 1;
    signupRequest = route.request().postDataJSON();
    signupAuthorization = route.request().headers().authorization;

    await route.fulfill({
      status: 201,
      json: {
        userId: '2',
        loginId: 'hiker01',
        nickname: '산친구',
      },
    });
  });

  await page.goto('/signup');

  await expect(page.getByRole('heading', { name: '회원가입' })).toBeVisible();

  const submit = page.getByRole('button', { name: '회원가입하기' });
  const password = page.locator('#signup-password');

  await expect(submit).toBeDisabled();

  // 초기 상태에서는 유효성 오류를 표시하지 않는다.
  await expect(password).not.toHaveAttribute('aria-invalid', 'true');

  // 잘못된 비밀번호를 입력하고 포커스를 해제하면 오류 표시
  await password.fill('1234');
  await password.blur();
  await expect(password).toHaveAttribute('aria-invalid', 'true');

  // 올바른 비밀번호로 수정하면 오류 해제
  await password.fill('Hiking!2026');
  await expect(password).not.toHaveAttribute('aria-invalid', 'true');

  await page.getByLabel('아이디').fill('hiker01');
  await page.locator('#signup-passwordConfirm').fill('Hiking!2026');
  await page.getByLabel('닉네임').fill('산친구');

  await page.getByRole('checkbox', { name: /서비스 이용약관/ }).check();
  await page.getByRole('checkbox', { name: /개인정보 수집 및 이용/ }).check();

  await expect(submit).toBeEnabled();

  const passwordConfirm = page.getByLabel('비밀번호 확인', { exact: true });

  await page.getByRole('button', { name: '비밀번호 표시', exact: true }).click();
  await expect(password).toHaveAttribute('type', 'text');

  await page.getByRole('button', { name: '비밀번호 확인 표시', exact: true }).click();
  await expect(passwordConfirm).toHaveAttribute('type', 'text');

  expect(signupRequestCount).toBe(0);

  await submit.click();

  await expect(page).toHaveURL('/login');

  expect(signupRequest).toEqual({
    loginId: 'hiker01',
    nickname: '산친구',
    password: 'Hiking!2026',
  });

  expect(signupRequestCount).toBe(1);
  expect(signupAuthorization).toBeUndefined();
});

test('회원가입 시 중복 아이디 오류를 해당 입력창에 표시한다', async ({ page }) => {
  await page.route('**/api/users/signup', async (route) => {
    await route.fulfill({
      status: 409,
      json: {
        status: 409,
        code: 'DUPLICATE_LOGIN_ID',
        message: '이미 사용 중인 아이디입니다.',
      },
    });
  });

  await page.goto('/signup');

  const loginId = page.getByLabel('아이디');

  await loginId.fill('hiker01');
  await page.locator('#signup-password').fill('Hiking!2026');
  await page.locator('#signup-passwordConfirm').fill('Hiking!2026');
  await page.getByLabel('닉네임').fill('산친구');

  await page.getByRole('checkbox', { name: /서비스 이용약관/ }).check();
  await page.getByRole('checkbox', { name: /개인정보 수집 및 이용/ }).check();

  await page.getByRole('button', { name: '회원가입하기' }).click();

  await expect(loginId).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByText('이미 사용 중인 아이디입니다.')).toBeVisible();

  // 아이디 변경 시 중복 오류를 초기화한다.
  await loginId.fill('another-hiker');

  await expect(loginId).not.toHaveAttribute('aria-invalid', 'true');
});

test('인증 화면은 모바일 카드와 데스크톱 분할 레이아웃을 제공한다', async ({ page }) => {
  for (const width of [360, 390, 440, 768, 1024, 1440, 1512]) {
    await page.setViewportSize({
      width,
      height: width < 768 ? 956 : 982,
    });

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
        return {
          width: rect.width,
          height: rect.height,
        };
      }),
    );
  }

  expect(desktopFrames[0]).toEqual(desktopFrames[1]);
});

test('비로그인 사용자는 기본 홈 화면을 볼 수 있다', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveURL('/');
  await expect(page.locator('main')).toBeVisible();

  await expect(page.getByRole('link', { name: '로그인', exact: true })).toBeVisible();
});

test('로그인 사용자는 기본 경로에서 산 목록으로 이동한다', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('orda.accessToken', 'valid-token');
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

  await page.goto('/');

  await expect(page).toHaveURL('/mountains');
});

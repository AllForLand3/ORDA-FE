import { expect, test } from '@playwright/test';

test('모바일 홈은 Figma 카피와 내부 로그인·가입 링크를 제공한다', async ({ page }) => {
  await page.setViewportSize({ width: 440, height: 956 });
  await page.goto('/');

  await expect(page.getByRole('heading', { name: '나에게 맞는 산길을, 더 쉽게' })).toBeVisible();
  const logo = page.getByRole('img', { name: 'ORDA 로고' });
  await expect(logo).toBeVisible();
  expect(await logo.boundingBox()).toMatchObject({ x: 33, y: 107, width: 65, height: 65 });

  const loginLink = page.getByRole('link', { name: '로그인하기' });
  await expect(loginLink).toHaveAttribute('href', '/login');
  expect(await loginLink.boundingBox()).toMatchObject({ x: 21, y: 742, width: 398, height: 63 });
  await expect(page.getByRole('link', { name: '회원가입하기' })).toHaveAttribute('href', '/signup');
  await expect(page.getByText('9:41')).toHaveCount(0);
  await loginLink.click();
  await expect(page).toHaveURL('/login');
  await page.reload();
  await expect(page.getByRole('heading', { name: '로그인', exact: true })).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL('/');
  await page.getByRole('link', { name: '회원가입하기' }).click();
  await expect(page).toHaveURL('/signup');
});

test('모바일 홈은 360·390·440px에서 가로 넘침 없이 CTA를 맞춘다', async ({ page }) => {
  for (const width of [360, 390, 440]) {
    await page.setViewportSize({ width, height: 956 });
    await page.goto('/');

    const loginLink = page.getByRole('link', { name: '로그인하기' });
    const size = await loginLink.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return {
        left: rect.left,
        width: rect.width,
        scrollWidth: document.documentElement.scrollWidth,
      };
    });

    expect(size.scrollWidth).toBeLessThanOrEqual(width);
    expect(size.left).toBe(21);
    expect(size.width).toBe(width - 42);
  }
});

test('PC 홈은 Figma 콘텐츠·헤더·계정 메뉴를 표시하고 미완성 메뉴는 링크로 가장하지 않는다', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1512, height: 982 });
  await page.goto('/');

  await expect(page.getByRole('heading', { name: '나에게 맞는 산길을, 더 쉽게' })).toBeVisible();
  await expect(page.getByText('서비스 소개', { exact: true })).toBeVisible();
  await expect(page.getByText('주요 기능', { exact: true })).toBeVisible();
  await expect(page.getByText('코스 추천', { exact: true })).toBeVisible();
  await expect(page.getByText('이용 안내', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: '서비스 소개' })).toHaveCount(0);

  const logoBox = await page.getByRole('img', { name: 'ORDA 로고' }).boundingBox();
  expect(logoBox?.x).toBeCloseTo(54, 0);
  expect(logoBox?.y).toBeCloseTo(44, 0);
  expect(logoBox?.width).toBe(173);
  expect(logoBox?.height).toBe(56);

  const primaryAction = page.getByRole('link', { name: '로그인하기' });
  await expect(primaryAction).toHaveAttribute('href', '/login');
  const actionBox = await primaryAction.boundingBox();
  expect(actionBox?.x).toBeCloseTo(70, 0);
  expect(actionBox?.y).toBeCloseTo(614, 0);
  expect(actionBox?.width).toBe(223);
  expect(actionBox?.height).toBe(58);
});

test('태블릿과 PC 홈은 지정 viewport에서 가로 넘침 없이 배치된다', async ({ page }) => {
  const viewports = [
    { width: 768, height: 1024, menuVisible: false },
    { width: 1024, height: 768, menuVisible: true },
    { width: 1440, height: 900, menuVisible: true },
    { width: 1512, height: 982, menuVisible: true },
  ];

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto('/');

    await expect(page.getByRole('heading', { name: '나에게 맞는 산길을, 더 쉽게' })).toBeVisible();
    await expect(page.locator('.home-page__header')).toBeVisible();
    await expect(page.locator('.home-page__menu')).toHaveCSS(
      'display',
      viewport.menuVisible ? 'flex' : 'none',
    );

    const layout = await page.evaluate(() => {
      const action = document.querySelector('.home-page__actions');
      const rect = action?.getBoundingClientRect();
      return {
        documentWidth: document.documentElement.scrollWidth,
        actionLeft: rect?.left ?? 0,
        actionRight: rect?.right ?? 0,
      };
    });

    expect(layout.documentWidth).toBeLessThanOrEqual(viewport.width);
    expect(layout.actionLeft).toBeGreaterThanOrEqual(0);
    expect(layout.actionRight).toBeLessThanOrEqual(viewport.width);
  }
});

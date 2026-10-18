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

test('데스크톱에서는 단계 2 이전의 홈 화면을 유지한다', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 982 });
  await page.goto('/');

  await expect(page.getByRole('heading', { name: '산길' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '나에게 맞는 산길을, 더 쉽게' })).toBeHidden();
});

import { expect, test } from '@playwright/test';

test('홈 화면을 표시한다', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: '산길' })).toBeVisible();
});

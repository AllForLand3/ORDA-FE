import { expect, test } from '@playwright/test';

test('출발·도착 선택, 위치 확인, 조건 설정과 이전 이동에서 상태를 유지한다', async ({ page }) => {
  await page.setViewportSize({ width: 440, height: 956 });
  await page.goto('/routes/setup');

  const next = page.getByRole('button', { name: /다음/ });
  await expect(page.getByRole('heading', { name: '출발지와 도착지' })).toBeVisible();
  await expect(next).toBeDisabled();
  await expect(page.locator('.orda-map-layout__map-surface')).toHaveAttribute(
    'data-map-ready',
    'true',
  );

  await page.getByRole('button', { name: '출발지를 검색해주세요' }).click();
  await page.getByRole('searchbox', { name: '출발지 검색' }).fill('없는 장소');
  await expect(page.getByRole('status').filter({ hasText: '검색 결과가 없어요.' })).toBeVisible();
  await page.getByRole('searchbox', { name: '출발지 검색' }).fill('서울대');
  await page.getByRole('button', { name: /서울대 건설환경종합연구소 앞/ }).click();
  await expect(page.getByText('이 예시 장소를 출발지로 설정할까요?')).toBeVisible();
  await page.getByRole('button', { name: '출발지로 설정' }).click();

  await page.getByRole('button', { name: '도착지를 검색해주세요' }).click();
  await page.getByRole('searchbox', { name: '도착지 검색' }).fill('연주대');
  await page.getByRole('button', { name: /관악산 연주대/ }).click();
  await page.getByRole('button', { name: '도착지로 설정' }).click();
  await page.getByRole('button', { name: /관악산 연주대/ }).click();
  await page.getByRole('searchbox', { name: '도착지 검색' }).fill('서울대입구');
  await page.getByRole('button', { name: /관악산 서울대입구/ }).focus();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: '취소', exact: true }).click();
  await expect(page.getByRole('button', { name: /관악산 연주대/ })).toBeVisible();
  await page.getByRole('button', { name: /관악산 연주대/ }).click();
  await page.getByRole('searchbox', { name: '도착지 검색' }).fill('서울대입구');
  await page.getByRole('button', { name: /관악산 서울대입구/ }).click();
  await page.getByRole('button', { name: '도착지로 설정' }).click();
  await expect(page.getByRole('button', { name: /관악산 서울대입구/ })).toBeVisible();
  await page.getByRole('button', { name: '도착지 선택 해제' }).click();
  await expect(next).toBeDisabled();
  await page.getByRole('button', { name: '도착지를 검색해주세요' }).click();
  await page.getByRole('searchbox', { name: '도착지 검색' }).fill('연주대');
  await page.getByRole('button', { name: /관악산 연주대/ }).click();
  await page.getByRole('button', { name: '도착지로 설정' }).click();
  await expect(next).toBeEnabled();
  await expect(page.getByText('예시 장소 · 실제 경로 추천 미연결')).toBeVisible();

  await next.click();
  await expect(page.getByRole('heading', { name: '나의 등산 수준' })).toBeVisible();
  await page.getByRole('radio', { name: /중급/ }).click();
  await page.getByRole('button', { name: '다음', exact: false }).click();
  await expect(page.getByRole('heading', { name: '어떤 코스를 원하시나요?' })).toBeVisible();
  await expect(page.getByRole('button', { name: '맞춤 경로 탐색하기' })).toBeDisabled();
  await expect(page.getByText(/실제 경로 추천 기능은 아직 연결되지 않았어요/)).toBeVisible();

  await page.goBack();
  await expect(page.getByRole('heading', { name: '나의 등산 수준' })).toBeVisible();
  await expect(page.getByRole('radio', { name: /중급/ })).toBeChecked();
  await page.goBack();
  await expect(page.getByRole('heading', { name: '출발지와 도착지' })).toBeVisible();
  await expect(page.getByRole('button', { name: /서울대 건설환경종합연구소 앞/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /관악산 연주대/ })).toBeVisible();
});

test('코스 탐색 UI는 모바일·태블릿·데스크톱 폭에서 넘치지 않는다', async ({ page }) => {
  for (const viewport of [
    { width: 360, height: 800 },
    { width: 390, height: 844 },
    { width: 440, height: 956 },
    { width: 768, height: 1024 },
    { width: 1024, height: 768 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/routes/setup');
    await expect(page.getByRole('heading', { name: '출발지와 도착지' })).toBeVisible();

    const geometry = await page.evaluate(() => {
      const panel = document
        .querySelector('.orda-responsive-panel__surface')
        ?.getBoundingClientRect();
      const map = document.querySelector('.orda-map-layout__map')?.getBoundingClientRect();
      return {
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
        panelRight: panel?.right ?? 0,
        mapLeft: map?.left ?? 0,
      };
    });

    expect(geometry.documentWidth).toBeLessThanOrEqual(viewport.width);
    if (viewport.width === 440) {
      await page.screenshot({ path: 'test-results/route-setup-440.png' });
      await page.goto('/routes/setup?step=conditions');
      await expect(page.getByRole('heading', { name: '어떤 코스를 원하시나요?' })).toBeVisible();
      await page.screenshot({ path: 'test-results/route-setup-conditions-440.png' });
    }
    if (viewport.width >= 768) {
      expect(geometry.mapLeft).toBeGreaterThanOrEqual(geometry.panelRight - 1);
      await expect(page.getByText('코스 탐색 설정', { exact: true }).last()).toBeVisible();
      if (viewport.width === 1024) {
        await page.screenshot({ path: 'test-results/route-setup-1024.png' });
      }
    }
  }

  await page.setViewportSize({ width: 360, height: 640 });
  await page.goto('/routes/setup?step=conditions');
  const content = page.locator('.orda-responsive-panel__content');
  const scrollState = await content.evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
  }));
  expect(scrollState.scrollHeight).toBeGreaterThan(scrollState.clientHeight);
  await page.getByRole('button', { name: /위험 관련 지점/ }).scrollIntoViewIfNeeded();
  await expect(page.getByRole('button', { name: /위험 관련 지점/ })).toBeVisible();
});

test('산 선택 화면에서 코스 탐색 설정으로 이동할 수 있다', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/mountains');
  await page.getByRole('button', { name: '코스 탐색 설정' }).click();
  await expect(page).toHaveURL(/\/routes\/setup/);
  await expect(page.getByRole('heading', { name: '출발지와 도착지' })).toBeVisible();
});

test('지도에서 지정한 좌표는 예시 장소와 구분해 출발지 후보로 확인한다', async ({ page }) => {
  await page.setViewportSize({ width: 440, height: 956 });
  await page.goto('/routes/setup');
  await page.getByRole('button', { name: '출발지 지도에서 선택' }).click();
  await expect(
    page.getByRole('status').filter({ hasText: '지도를 눌러 출발지를 선택해주세요.' }),
  ).toBeVisible();

  await page.locator('.orda-map-layout__map-surface').click({ position: { x: 220, y: 180 } });
  await expect(page.getByText('이 위치를 출발지로 설정할까요?')).toBeVisible();
  await expect(page.getByText('사용자 지정 위치 · 주소 정보 없음')).toBeVisible();
  await page.getByRole('button', { name: '출발지로 설정' }).click();
  await expect(page.getByText('지도에서 직접 선택')).toBeVisible();
});

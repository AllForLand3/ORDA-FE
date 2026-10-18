import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/fixtures/map-page-layout.html');
});

test('모바일과 데스크톱에서 지도·패널·하단 내비게이션을 화면 폭에 맞춰 배치한다', async ({
  page,
}) => {
  const viewports = [
    { width: 360, height: 956 },
    { width: 390, height: 956 },
    { width: 440, height: 956 },
    { width: 768, height: 1024 },
    { width: 1024, height: 768 },
    { width: 1440, height: 900 },
  ];

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await expect(page.getByRole('region', { name: '지도 영역' })).toBeVisible();
    await expect(page.getByText('OpenLayers 연결 전')).toBeVisible();
    await expect(page.getByRole('complementary', { name: '지도 작업 패널' })).toBeVisible();

    const layout = await page.evaluate(() => {
      const map = document.querySelector('.orda-map-layout__map');
      const panel = document.querySelector('.orda-responsive-panel__surface');
      const bottomNavigation = document.querySelector('.orda-map-layout__bottom-navigation');
      const controls = document.querySelector('.orda-map-layout__controls');
      const mapBox = map?.getBoundingClientRect();
      const panelBox = panel?.getBoundingClientRect();
      const navigationBox = bottomNavigation?.getBoundingClientRect();
      const controlsBox = controls?.getBoundingClientRect();
      const workspaceBox = document
        .querySelector('.orda-map-layout__workspace')
        ?.getBoundingClientRect();

      return {
        documentWidth: document.documentElement.scrollWidth,
        map: mapBox ? { x: mapBox.x, right: mapBox.right, width: mapBox.width } : null,
        panel: panelBox
          ? {
              x: panelBox.x,
              y: panelBox.y,
              right: panelBox.right,
              bottom: panelBox.bottom,
              width: panelBox.width,
            }
          : null,
        navigation: navigationBox
          ? { y: navigationBox.y, display: getComputedStyle(bottomNavigation!).display }
          : null,
        controls: controlsBox
          ? { top: controlsBox.top, right: controlsBox.right, bottom: controlsBox.bottom }
          : null,
        workspace: workspaceBox ? { top: workspaceBox.top, bottom: workspaceBox.bottom } : null,
      };
    });

    expect(layout.documentWidth).toBeLessThanOrEqual(viewport.width);
    expect(layout.map?.width).toBeGreaterThan(0);
    expect(layout.panel?.width).toBeGreaterThan(0);
    expect(layout.controls?.right).toBeLessThanOrEqual(viewport.width);

    if (viewport.width < 768) {
      expect(layout.map?.x).toBe(0);
      expect(layout.map?.width).toBe(viewport.width);
      expect(layout.panel?.right).toBe(viewport.width);
      expect(layout.panel?.y).toBeGreaterThanOrEqual(layout.controls?.bottom ?? 0);
      expect(layout.panel?.bottom).toBeLessThanOrEqual(layout.navigation?.y ?? viewport.height);
      expect(layout.navigation?.display).not.toBe('none');
    } else {
      expect(layout.panel?.x).toBe(0);
      expect(layout.panel?.width).toBeGreaterThanOrEqual(360);
      expect(layout.panel?.width).toBeLessThanOrEqual(440);
      expect(layout.map?.x).toBe(layout.panel?.right);
      expect(layout.panel?.y).toBe(layout.workspace?.top);
      expect(layout.panel?.bottom).toBe(layout.workspace?.bottom);
      expect(layout.navigation?.display).toBe('none');
    }
  }
});

test('패널은 키보드로 접고 펼칠 수 있고 닫힌 동안 콘텐츠를 탭 순서에서 뺀다', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 956 });
  await page.keyboard.press('Tab');

  const searchButton = page.getByRole('button', { name: '산 검색' });
  await expect(searchButton).toBeFocused();
  await page.keyboard.press('Tab');

  const closeButton = page.getByRole('button', { name: '패널 접기' });
  await expect(closeButton).toBeFocused();
  await expect(closeButton).toHaveCSS('outline-style', 'solid');
  await page.keyboard.press('Enter');

  const panel = page.getByRole('complementary', { name: '지도 작업 패널' });
  await expect(panel).toBeHidden();

  const openButton = page.getByRole('button', { name: '패널 펼치기' });
  await openButton.focus();
  await page.keyboard.press('Enter');
  await expect(panel).toBeVisible();

  await page.setViewportSize({ width: 1024, height: 768 });
  const map = page.getByRole('region', { name: '지도 영역' });
  await page.getByRole('button', { name: '패널 접기' }).click();
  await expect(panel).toBeHidden();
  await expect(map).toHaveJSProperty('clientWidth', 1024);
});

test('모바일과 데스크톱 패널 콘텐츠는 내부에서 스크롤된다', async ({ page }) => {
  for (const viewport of [
    { width: 390, height: 956 },
    { width: 1024, height: 768 },
  ]) {
    await page.setViewportSize(viewport);
    const content = page.locator('.orda-responsive-panel__content');
    await content.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });

    const scrollPosition = await content.evaluate((element) => ({
      scrollTop: element.scrollTop,
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
    }));

    expect(scrollPosition.scrollTop).toBeGreaterThan(0);
    expect(scrollPosition.scrollHeight).toBeGreaterThan(scrollPosition.clientHeight);
  }
});

import { expect, test } from '../fixtures/authenticatedTest';

test('산 선택 화면은 440px에서 지도와 산 선택 패널을 표시한다', async ({ page }) => {
  await page.setViewportSize({ width: 440, height: 956 });
  await page.goto('/mountains');

  await expect(page.getByRole('heading', { name: '어느 산으로 갈까요?' })).toBeVisible();
  const panel = page.getByRole('complementary', { name: '산 선택 패널' });
  await expect(panel.getByRole('searchbox', { name: '산 이름 검색' })).toBeVisible();
  await expect(page.locator('.orda-map-layout__header').getByRole('searchbox')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'ORDA 홈으로 이동' })).toBeVisible();
  await expect(page.getByText('화면 확인용 예시 데이터')).toBeVisible();
  await expect(page.locator('.orda-map-layout__map-surface')).toHaveAttribute(
    'data-map-ready',
    'true',
  );
  await expect(page.getByRole('link', { name: '산 탐색, 현재 화면' })).toBeVisible();

  const layout = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
    panelTop: document.querySelector('.orda-responsive-panel__surface')?.getBoundingClientRect()
      .top,
    navigationTop: document
      .querySelector('.orda-map-layout__bottom-navigation')
      ?.getBoundingClientRect().top,
  }));

  expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth);
  expect(layout.panelTop).toBeCloseTo(514, 0);
  expect(layout.navigationTop).toBeGreaterThan(800);
  await page.screenshot({ path: 'test-results/mountain-select-440.png' });
});

test('모바일 하단 내비게이션은 내 코스와 같은 아이콘·글자 크기를 사용한다', async ({ page }) => {
  await page.setViewportSize({ width: 440, height: 956 });

  const readNavigationMetrics = async (navigationName: string) =>
    page
      .getByRole('navigation', { name: navigationName })
      .getByRole('link')
      .evaluateAll((links) =>
        links.map((link) => {
          const image = link.querySelector('img');
          const label = link.querySelector('span');
          const imageBox = image?.getBoundingClientRect();

          return {
            fontSize: label ? getComputedStyle(label).fontSize : null,
            imageHeight: imageBox?.height ?? null,
            imageWidth: imageBox?.width ?? null,
          };
        }),
      );

  await page.goto('/my-courses');
  const myCoursesMetrics = await readNavigationMetrics('내 코스 내비게이션');

  await page.goto('/mountains');
  const mountainMetrics = await readNavigationMetrics('산 선택 화면 내비게이션');

  expect(mountainMetrics).toEqual(myCoursesMetrics);
});

test('산 선택 레이아웃은 360·768·1024px에서 넘치지 않고 패널과 지도를 분리한다', async ({
  page,
}) => {
  for (const viewport of [
    { width: 360, height: 800 },
    { width: 768, height: 1024 },
    { width: 1024, height: 768 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/mountains');
    await expect(page.getByRole('heading', { name: '어느 산으로 갈까요?' })).toBeVisible();

    const layout = await page.evaluate(() => {
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

    expect(layout.documentWidth).toBeLessThanOrEqual(viewport.width);

    if (viewport.width >= 768) {
      expect(layout.mapLeft).toBeGreaterThanOrEqual(layout.panelRight - 1);
      await expect(page.getByRole('navigation', { name: '주요 메뉴' })).toBeVisible();
    }
  }
});

test('검색·필터는 빈 결과와 초기화를 처리한다', async ({ page }) => {
  await page.setViewportSize({ width: 440, height: 956 });
  await page.goto('/mountains');

  await page.getByRole('searchbox', { name: '산 이름 검색' }).fill('없는 산 이름');
  await expect(page.getByText('검색 결과가 없어요.')).toBeVisible();
  await page.getByRole('button', { name: '검색과 필터 초기화' }).click();
  await expect(page.locator('.mountain-card')).toHaveCount(3);

  await page.getByRole('button', { name: '경기', exact: true }).click();
  await expect(page.locator('.mountain-card')).toHaveCount(1);
  await expect(page.locator('.mountain-card')).toContainText('청계산');

  await page.getByRole('button', { name: '추가 필터 열기' }).click();
  await page.getByRole('button', { name: '중급', exact: true }).click();
  await expect(page.getByText('검색 결과가 없어요.')).toBeVisible();
});

test('산 카드는 키보드 선택과 Escape·버튼 선택 취소를 지원한다', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/mountains');

  const gwanaksan = page.locator('.mountain-card').filter({ hasText: '관악산' });
  const bukhansan = page.locator('.mountain-card').filter({ hasText: '북한산' });
  const mapSurface = page.locator('.orda-map-layout__map-surface');
  const initialMapRevision = await mapSurface.getAttribute('data-map-view-revision');

  await expect(gwanaksan).toHaveAttribute('aria-pressed', 'true');
  await bukhansan.focus();
  await page.keyboard.press('Enter');
  await expect(bukhansan).toHaveAttribute('aria-pressed', 'true');
  await expect(gwanaksan).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByText('선택한 산: 북한산')).toBeVisible();
  await expect
    .poll(() => mapSurface.getAttribute('data-map-view-revision'))
    .not.toBe(initialMapRevision);

  await page.keyboard.press('Escape');
  await expect(bukhansan).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByText('산을 선택하지 않았습니다.')).toBeVisible();

  await gwanaksan.scrollIntoViewIfNeeded();
  await gwanaksan.click();
  await page.getByRole('button', { name: '선택 취소' }).click();
  await expect(gwanaksan).toHaveAttribute('aria-pressed', 'false');
});

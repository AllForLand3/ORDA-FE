import { expect, test, installAuthenticatedSession } from '../fixtures/authenticatedTest';

test('모바일 산 목록은 실제 터치 드래그로 높이를 바꾸고 내부 스크롤·드래그 취소를 처리한다', async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    baseURL,
    isMobile: true,
    hasTouch: true,
    reducedMotion: 'reduce',
    viewport: { width: 440, height: 956 },
  });
  await installAuthenticatedSession(context);
  const page = await context.newPage();
  const client = await context.newCDPSession(page);
  async function touch(
    type: 'touchStart' | 'touchMove' | 'touchEnd' | 'touchCancel',
    x = 0,
    y = 0,
  ) {
    await client.send('Input.dispatchTouchEvent', {
      type,
      touchPoints: type === 'touchEnd' || type === 'touchCancel' ? [] : [{ x, y }],
    });
  }
  async function swipeHandle(distance: number, cancel = false) {
    const handle = await page.locator('.orda-responsive-panel__resize-handle').boundingBox();
    if (!handle) throw new Error('드래그 손잡이가 없습니다.');
    const x = handle.x + handle.width / 2;
    const y = handle.y + handle.height / 2;
    await touch('touchStart', x, y);
    for (let step = 1; step <= 10; step += 1)
      await touch('touchMove', x, y + (distance * step) / 10);
    await touch(cancel ? 'touchCancel' : 'touchEnd');
  }
  try {
    for (const viewport of [
      { width: 360, height: 800 },
      { width: 390, height: 844 },
      { width: 440, height: 956 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto('/mountains');
      const root = page.locator('.orda-responsive-panel');
      const panel = page.getByRole('complementary', { name: '산 선택 패널' });
      const initialHeight = await panel.evaluate((element) => element.clientHeight);
      await swipeHandle(-120);
      await expect(root).toHaveAttribute('data-panel-height', 'expanded');
      await expect
        .poll(() => panel.evaluate((element) => element.clientHeight))
        .toBeGreaterThan(initialHeight + 100);
      const expandedHeight = await panel.evaluate((element) => element.clientHeight);
      const content = page.locator('.orda-responsive-panel__content');
      const contentBox = await content.boundingBox();
      if (!contentBox) throw new Error('목록이 없습니다.');
      const needsScroll = await content.evaluate(
        (element) => element.scrollHeight > element.clientHeight,
      );
      if (needsScroll) {
        await touch(
          'touchStart',
          contentBox.x + contentBox.width / 2,
          contentBox.y + contentBox.height - 30,
        );
        for (let step = 1; step <= 10; step += 1)
          await touch(
            'touchMove',
            contentBox.x + contentBox.width / 2,
            contentBox.y + contentBox.height - 30 - step * 10,
          );
        await touch('touchEnd');
        await expect
          .poll(() => content.evaluate((element) => element.scrollTop))
          .toBeGreaterThan(0);
      } else {
        await expect(page.locator('.mountain-card').last()).toBeInViewport();
      }
      expect(await panel.evaluate((element) => element.clientHeight)).toBe(expandedHeight);
      const footer = await page
        .getByRole('button', { name: '코스 탐색 설정', exact: true })
        .boundingBox();
      const navigation = await page
        .getByRole('navigation', { name: '산 선택 화면 내비게이션' })
        .boundingBox();
      if (!footer || !navigation) throw new Error('하단 내비게이션이 없습니다.');
      expect(footer.y + footer.height).toBeLessThanOrEqual(navigation.y);
      expect(
        await page.locator('.ol-attribution').evaluate((element) => {
          const rect = element.getBoundingClientRect();
          return element.contains(
            document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2),
          );
        }),
      ).toBe(true);
      if (viewport.width === 440)
        await page.screenshot({ path: 'test-results/mountain-panel-expanded-440.png' });
      await swipeHandle(120);
      await expect(root).toHaveAttribute('data-panel-height', 'compact');
      await expect
        .poll(() => panel.evaluate((element) => element.clientHeight))
        .toBe(initialHeight);
      await swipeHandle(-100, true);
      await expect(root).toHaveAttribute('data-panel-height', 'compact');
      await expect
        .poll(() => panel.evaluate((element) => element.clientHeight))
        .toBe(initialHeight);
      expect(await panel.getAttribute('data-dragging')).toBeNull();
      await swipeHandle(120);
      await expect(panel).not.toBeVisible();
      await page.getByRole('button', { name: '패널 펼치기' }).click();
      await expect(panel).toBeVisible();
      await expect(root).toHaveAttribute('data-panel-height', 'compact');
      await page.locator('.orda-responsive-panel__resize-handle').focus();
      await page.keyboard.press('Enter');
      await expect(root).toHaveAttribute('data-panel-height', 'expanded');
    }
  } finally {
    await client.detach();
    await context.close();
  }
});

test('산 목록 높이는 키보드로도 조절하고 PC 전환·접기에서도 기존 동작을 유지한다', async ({
  page,
}) => {
  await page.setViewportSize({ width: 440, height: 956 });
  await page.goto('/mountains');
  const handle = page.locator('.orda-responsive-panel__resize-handle');
  const root = page.locator('.orda-responsive-panel');
  await handle.focus();
  await page.keyboard.press('ArrowUp');
  await expect(root).toHaveAttribute('data-panel-height', 'expanded');
  await page.keyboard.press('ArrowDown');
  await expect(root).toHaveAttribute('data-panel-height', 'compact');
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('complementary', { name: '산 선택 패널' })).not.toBeVisible();
  await page.getByRole('button', { name: '패널 펼치기' }).click();
  await handle.focus();
  await page.keyboard.press('Enter');
  await expect(root).toHaveAttribute('data-panel-height', 'expanded');
  await page.keyboard.press('Space');
  await expect(root).toHaveAttribute('data-panel-height', 'compact');
  await expect(handle).toBeVisible();
  await page.setViewportSize({ width: 1024, height: 768 });
  await expect(handle).not.toBeVisible();
  const panel = await page.getByRole('complementary', { name: '산 선택 패널' }).boundingBox();
  const workspace = await page.locator('.orda-map-layout__workspace').boundingBox();
  if (!panel || !workspace) throw new Error('PC 패널이 없습니다.');
  expect(Math.abs(panel.height - workspace.height)).toBeLessThanOrEqual(1);
  await page.getByRole('button', { name: '패널 접기' }).click();
  await page.getByRole('button', { name: '패널 펼치기' }).click();
  await page.setViewportSize({ width: 440, height: 956 });
  await expect(handle).toBeVisible();
});

test('PC·태블릿 헤더는 로고와 개인 메뉴만 표시하고 패널 검색창과 분리된다', async ({ page }) => {
  for (const viewport of [
    { width: 768, height: 1024 },
    { width: 1024, height: 768 },
    { width: 1440, height: 900 },
    { width: 1512, height: 982 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/mountains');
    await expect(page.getByRole('navigation', { name: '주요 메뉴', exact: true })).toHaveCount(0);
    const header = page.locator('.mountain-explorer-header');
    const myCourses = header.getByRole('link', { name: '내 코스', exact: true });
    const myPage = header.getByRole('link', { name: '마이페이지로 이동' });
    await expect(myCourses).toHaveAttribute('href', '/my-courses');
    await expect(myPage).toHaveAttribute('href', '/my-page');
    const panel = page.getByRole('complementary', { name: '산 선택 패널' });
    const search = await panel.getByRole('searchbox', { name: '산 이름 검색' }).boundingBox();
    const actionsBox = await header.locator('.mountain-explorer-header__actions').boundingBox();
    const brandBox = await page.getByRole('link', { name: 'ORDA 산 탐색으로 이동' }).boundingBox();
    if (!search || !actionsBox || !brandBox) throw new Error('PC 헤더가 없습니다.');
    await expect(page.locator('.orda-map-layout__header').getByRole('searchbox')).toHaveCount(0);
    expect(
      Math.abs(actionsBox.y + actionsBox.height / 2 - (brandBox.y + brandBox.height / 2)),
    ).toBeLessThan(2);
    expect(brandBox.x).toBeLessThan(viewport.width * 0.15);
    expect(actionsBox.x + actionsBox.width).toBeGreaterThan(viewport.width * 0.85);
    expect(actionsBox.y + actionsBox.height).toBeLessThanOrEqual(search.y);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      viewport.width,
    );
    await page.screenshot({ path: `test-results/mountain-header-${viewport.width}.png` });
    await myCourses.click();
    await expect(page).toHaveURL('/my-courses');
    await page.goBack();
  }
});

test('모바일 코스 설정의 뒤로가기는 직접 접근·검색·단계 이동에서 확정한 선택을 보존한다', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/routes/setup');
  const back = page.getByRole('button', { name: '뒤로가기', exact: true });
  await back.click();
  await expect(page).toHaveURL('/mountains');
  const params =
    'origin=seoul-national-university-research-center&destination=gwanaksan-yeonjudae&level=intermediate&priorities=gentle-slope&facilities=parking';
  await page.goto(`/routes/setup?${params}&step=conditions`);
  await back.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: '나의 등산 수준' })).toBeVisible();
  await expect(page.getByRole('radio', { name: /중급/ })).toBeChecked();
  await back.click();
  await expect(page.getByRole('heading', { name: '출발지와 도착지' })).toBeVisible();
  for (const [key, value] of new URLSearchParams(params))
    expect(new URL(page.url()).searchParams.get(key)).toBe(value);
  await page.goto(
    `/routes/setup?${params}&searchFor=destination&pending=gwanaksan-entrance&q=서울대`,
  );
  await expect(page.getByText('이 예시 장소를 도착지로 설정할까요?')).toBeVisible();
  await back.click();
  const afterSearch = new URL(page.url()).searchParams;
  for (const [key, value] of new URLSearchParams(params)) expect(afterSearch.get(key)).toBe(value);
  for (const key of ['searchFor', 'pending', 'q', 'mapSelect'])
    expect(afterSearch.has(key)).toBe(false);
  await expect(page.getByRole('searchbox')).toHaveCount(0);
  await page.goto(`/routes/setup?${params}&searchFor=origin&mapSelect=true`);
  await back.click();
  expect(new URL(page.url()).searchParams.has('mapSelect')).toBe(false);
  await page.reload();
  await expect(back).toBeVisible();
  await page.screenshot({ path: 'test-results/route-setup-back-390.png' });
  await back.click();
  await expect(page).toHaveURL('/mountains');
});

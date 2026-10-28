import { expect, isDomainApiRequest, test } from '../fixtures/authenticatedTest';

test('예시 코스를 선택하고 탭·뒤로가기·새로고침에서도 선택을 유지한다', async ({ page }) => {
  const apiRequests: string[] = [];
  page.on('request', (request) => {
    if (isDomainApiRequest(request.url())) apiRequests.push(request.url());
  });
  await page.setViewportSize({ width: 440, height: 956 });
  await page.goto('/routes/results');
  await expect(page.getByRole('heading', { name: '경로 분석 결과' })).toBeVisible();
  await expect(page.getByText('3개 코스 · 모든 지표는 예시 데이터입니다.')).toBeVisible();
  const first = page.getByRole('button', { name: '예시 코스 1: 능선 조망 코스 선택' });
  const second = page.getByRole('button', { name: '예시 코스 2: 계곡 완만 코스 선택' });
  await expect(first).toHaveAttribute('aria-pressed', 'true');
  await second.focus();
  await page.keyboard.press('Enter');
  await expect(second).toHaveAttribute('aria-pressed', 'true');
  await expect(first).toHaveAttribute('aria-pressed', 'false');

  await page.getByRole('tab', { name: '코스 비교' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: '지형 분석' })).toBeFocused();
  await expect(page.getByText('분석 미제공', { exact: true })).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByText('시설 정보 미제공')).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('tab', { name: '지형 분석' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.getByRole('tab', { name: '지형 분석' }).focus();
  await page.keyboard.press('Home');
  await expect(second).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(second).toHaveAttribute('aria-pressed', 'true');

  const card = page.getByRole('article', { name: '예시 코스 2: 계곡 완만 코스' });
  await card.getByText('상세보기', { exact: true }).click();
  await expect(
    card.getByText('실제 등산로, 경로 선형과 분석 자료는 제공되지 않았습니다.'),
  ).toBeVisible();
  expect(apiRequests).toEqual([]);
});

test('편집 모달은 임시 입력과 취소만 허용하고 키보드 포커스를 유지한다', async ({ page }) => {
  await page.setViewportSize({ width: 440, height: 956 });
  await page.goto('/routes/results');
  const card = page.getByRole('article', { name: '예시 코스 1: 능선 조망 코스' });
  const trigger = card.getByRole('button', { name: '코스 편집' });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: /코스 편집/ });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: '저장', exact: true })).toBeDisabled();
  await expect(dialog.getByRole('button', { name: '삭제', exact: true })).toBeDisabled();
  await dialog.getByRole('textbox', { name: '코스 이름' }).fill('임시 변경 이름');
  await dialog.getByRole('textbox', { name: '메모' }).fill('취소하면 버리는 메모');
  for (let i = 0; i < 8; i += 1) {
    await page.keyboard.press('Tab');
    expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(card.getByText('능선 조망 코스', { exact: true })).toBeVisible();
  await trigger.click();
  await expect(dialog.getByRole('textbox', { name: '코스 이름' })).toHaveValue('능선 조망 코스');
  await expect(dialog.getByRole('textbox', { name: '메모' })).toHaveValue(
    '주말 아침을 위한 산책 코스',
  );
  await page.screenshot({ path: 'test-results/route-edit-dialog-440.png' });
  await dialog.getByRole('button', { name: '취소', exact: true }).click();
  await expect(trigger).toBeFocused();

  const downloads: string[] = [];
  page.on('download', (download) => downloads.push(download.suggestedFilename()));
  await card.getByRole('button', { name: '내보내기', exact: true }).click();
  await expect(page.getByRole('dialog', { name: '내보내기 준비 중' })).toBeVisible();
  await expect(page.getByRole('button', { name: '파일 내보내기 미연결' })).toBeDisabled();
  await page.keyboard.press('Escape');
  expect(downloads).toEqual([]);
});

test('로딩·빈 결과·오류 데모를 구분하고 분석 결측을 수치로 채우지 않는다', async ({ page }) => {
  await page.goto('/routes/results?candidate=invalid&tab=invalid');
  await expect(page.getByRole('tab', { name: '코스 비교' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  const preview = page.getByRole('combobox', { name: '화면 상태 미리보기' });
  await preview.selectOption('loading');
  await expect(page.getByText('예시 코스를 불러오는 모습이에요')).toBeVisible();
  await expect(page.locator('[aria-busy="true"]')).toBeVisible();
  await expect(page.getByRole('article')).toHaveCount(0);
  await preview.selectOption('empty');
  await expect(page.getByText('표시할 코스가 없어요')).toBeVisible();
  await preview.selectOption('error');
  await expect(page.getByRole('alert')).toContainText('코스를 표시하지 못했어요');
  await page.getByRole('button', { name: '예시 코스로 돌아가기' }).click();
  await expect(page.getByRole('article')).toHaveCount(3);
  await page.getByRole('tab', { name: '지형 분석' }).click();
  await expect(page.getByText('분석 미제공', { exact: true })).toBeVisible();
  await expect(page.getByRole('article')).toHaveCount(0);
});

test('모바일과 PC에서 패널·지도·에셋이 넘치지 않고 접기·스크롤이 동작한다', async ({ page }) => {
  for (const viewport of [
    { width: 360, height: 800 },
    { width: 390, height: 844 },
    { width: 440, height: 956 },
    { width: 768, height: 1024 },
    { width: 1024, height: 768 },
    { width: 1440, height: 900 },
    { width: 1512, height: 982 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/routes/results');
    const map = page.locator('.orda-map-layout__map-surface');
    await expect(map).toHaveAttribute('data-map-ready', 'true');
    await expect(page.getByRole('link', { name: 'OpenStreetMap' })).toBeVisible();
    const attributionIsUncovered = await page.locator('.ol-attribution').evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return element.contains(
        document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2),
      );
    });
    expect(attributionIsUncovered).toBe(true);
    const zoomIn = page.getByRole('button', { name: '+', exact: true });
    await expect(zoomIn).toBeVisible();
    await zoomIn.click();
    await expect(map).toHaveAttribute('data-map-zoom', '15');
    const panel = page.getByRole('complementary', { name: '예시 코스 비교 결과' });
    const geometry = await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
    }));
    expect(geometry.width).toBeLessThanOrEqual(geometry.viewport);
    const panelBox = await panel.boundingBox();
    const mapBox = await map.boundingBox();
    expect(panelBox).not.toBeNull();
    expect(mapBox).not.toBeNull();
    if (viewport.width >= 768 && panelBox && mapBox)
      expect(panelBox.x + panelBox.width).toBeLessThanOrEqual(mapBox.x + 1);

    const images = await page
      .locator('.route-candidate img')
      .evaluateAll((elements) =>
        elements.every(
          (element) =>
            element instanceof HTMLImageElement &&
            element.complete &&
            element.naturalWidth > 0 &&
            element.width > 0,
        ),
      );
    expect(images).toBe(true);
    if (viewport.width === 440 || viewport.width === 1024 || viewport.width === 1512) {
      await page.screenshot({ path: `test-results/route-results-${viewport.width}.png` });
    }
    const third = page.getByRole('button', { name: '예시 코스 3: 계곡 완만 코스 선택' });
    await third.focus();
    await page.keyboard.press('Enter');
    await expect(third).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: '패널 접기' }).click();
    await expect(panel).toBeHidden();
    await page.getByRole('button', { name: '패널 펼치기' }).click();
    await expect(panel).toBeVisible();
  }
});

test('설정 화면의 예시 진입과 조건 변경 링크가 입력된 조건을 유지한다', async ({ page }) => {
  await page.goto(
    '/routes/setup?step=conditions&level=intermediate&priorities=gentle-slope&facilities=shelter',
  );
  const explore = page.getByRole('button', { name: '맞춤 경로 탐색하기' });
  await expect(explore).toBeEnabled();
  await explore.click();
  await expect(page).toHaveURL(/\/routes\/results/);
  await expect(page.getByText('3개 코스 · 모든 지표는 예시 데이터입니다.')).toBeVisible();
  await page.getByRole('link', { name: '← 조건 변경' }).click();
  await expect(page).toHaveURL(/level=intermediate/);
  await expect(page).toHaveURL(/priorities=gentle-slope/);
  await expect(page).toHaveURL(/facilities=shelter/);
  await expect(page.getByRole('heading', { name: '어떤 코스를 원하시나요?' })).toBeVisible();
});

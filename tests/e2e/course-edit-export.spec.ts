import { expect, isDomainApiRequest, test } from '../fixtures/authenticatedTest';

test('예시 코스 이름·메모를 편집하고 화면 내 적용·초기화·재진입을 구분한다', async ({ page }) => {
  const apiRequests: string[] = [];
  page.on('request', (request) => {
    if (isDomainApiRequest(request.url())) apiRequests.push(request.url());
  });
  await page.setViewportSize({ width: 440, height: 956 });
  await page.goto('/my-courses?tab=saved&q=예시+2&sort=oldest');
  await page.getByRole('link', { name: '편집', exact: true }).click();
  await expect(page).toHaveURL(/example-ridge-2\/edit/);
  const name = page.getByRole('textbox', { name: '코스 이름' });
  const memo = page.getByRole('textbox', { name: '메모', exact: true });
  await expect(name).toHaveValue('능선 조망 코스 · 예시 2');
  await expect(memo).toHaveValue('주말 아침을 위한 산책 코스');
  await expect(page.getByText('경로 편집 도구 준비 중', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '코스 이름 지우기' }).click();
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(name).toHaveAttribute('aria-invalid', 'true');
  await expect(name).toBeFocused();
  await name.fill('로컬 예시 이름');
  await memo.fill('화면 안에서만 적용할 메모');
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('서버에는 저장되지 않으며');
  expect(
    await page.evaluate(() => {
      const event = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    }),
  ).toBe(false);
  await memo.fill('추가 변경');
  await page.getByRole('button', { name: '초기화', exact: true }).click();
  const reset = page.getByRole('dialog', { name: '입력을 초기화할까요?' });
  await expect(reset).toBeVisible();
  await reset.getByRole('button', { name: '계속 편집' }).click();
  await expect(memo).toHaveValue('추가 변경');
  await page.getByRole('button', { name: '초기화', exact: true }).click();
  await reset.getByRole('button', { name: '초기화', exact: true }).click();
  await expect(name).toHaveValue('능선 조망 코스 · 예시 2');
  await expect(memo).toHaveValue('주말 아침을 위한 산책 코스');
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await page.getByRole('link', { name: '취소', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('능선 조망 코스 · 예시 2');
  await page.getByRole('link', { name: '내 코스 목록으로', exact: true }).click();
  await expect(page.getByRole('searchbox', { name: '내 코스 검색' })).toHaveValue('예시 2');
  await expect(page.getByRole('combobox', { name: '코스 정렬' })).toHaveValue('oldest');
  await page.goto('/my-courses/example-ridge-2/edit');
  await expect(name).toHaveValue('능선 조망 코스 · 예시 2');
  expect(apiRequests).toEqual([]);
});

test('변경 중 취소·브라우저 뒤로가기·새로고침은 유실 확인을 제공한다', async ({ page }) => {
  await page.goto('/my-courses/example-ridge-1');
  await page.getByRole('link', { name: '편집', exact: true }).click();
  const name = page.getByRole('textbox', { name: '코스 이름' });
  await name.fill('버릴 변경');
  await page.getByRole('link', { name: '취소', exact: true }).click();
  const leave = page.getByRole('dialog', { name: '편집을 나갈까요?' });
  await expect(leave).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(leave).not.toBeVisible();
  await expect(name).toHaveValue('버릴 변경');
  await page.goBack();
  await expect(leave).toBeVisible();
  await leave.getByRole('button', { name: '계속 편집' }).click();
  await expect(name).toHaveValue('버릴 변경');
  await page.getByRole('link', { name: '취소', exact: true }).click();
  await leave.getByRole('button', { name: '변경 버리고 나가기' }).click();
  await expect(page).toHaveURL(/example-ridge-1(?:\?|$)/);
  await page.getByRole('link', { name: '편집', exact: true }).click();
  await name.fill('새로고침하면 사라짐');
  await page.getByRole('button', { name: '패널 접기' }).click();
  await page.getByRole('link', { name: '코스 편집', exact: true }).click();
  await expect(leave).toBeVisible();
  await leave.getByRole('button', { name: '계속 편집' }).click();
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(name).toBeVisible();
  await name.fill('새로고침하면 사라지는 추가 변경');
  const unload = page.waitForEvent('dialog');
  const reload = page.reload();
  const dialog = await unload;
  expect(dialog.type()).toBe('beforeunload');
  await dialog.accept();
  await reload;
  await expect(name).toHaveValue('능선 조망 코스');
});

test('내보내기는 형식 선택과 완료 디자인 미리보기만 제공하며 파일을 만들지 않는다', async ({
  page,
}) => {
  const downloads: string[] = [];
  const apiRequests: string[] = [];
  page.on('download', (download) => downloads.push(download.suggestedFilename()));
  page.on('request', (request) => {
    if (isDomainApiRequest(request.url())) apiRequests.push(request.url());
  });
  await page.setViewportSize({ width: 440, height: 956 });
  await page.goto('/my-courses');
  await page
    .getByRole('article')
    .first()
    .getByRole('link', { name: '내보내기', exact: true })
    .click();
  const sheet = page.getByRole('dialog', { name: '코스 내보내기', exact: true });
  await expect(sheet).toBeVisible();
  const gpx = sheet.getByRole('radio', { name: /^GPX/ });
  const geojson = sheet.getByRole('radio', { name: /^GeoJSON/ });
  await expect(gpx).toBeChecked();
  await gpx.focus();
  await page.keyboard.press('ArrowDown');
  await expect(geojson).toBeChecked();
  await expect(sheet.getByRole('button', { name: '내보내기', exact: true })).toBeDisabled();
  await expect(sheet.locator('.course-export-formats img').first()).toHaveJSProperty(
    'naturalWidth',
    26,
  );
  await page.screenshot({ path: 'test-results/course-export-440.png', animations: 'disabled' });
  await sheet.getByRole('button', { name: '완료 화면 미리보기', exact: true }).click();
  const preview = page.getByRole('dialog', { name: '코스 내보내기 완료 화면 미리보기' });
  await expect(preview).toContainText('선택한 형식: GeoJSON');
  await expect(preview.getByRole('status')).toHaveText('파일은 생성되거나 저장되지 않았습니다.');
  await expect(preview.locator('.course-export-preview > img')).toHaveJSProperty(
    'naturalWidth',
    100,
  );
  await page.screenshot({
    path: 'test-results/course-export-preview-440.png',
    animations: 'disabled',
  });
  await preview.getByRole('button', { name: '형식 선택으로 돌아가기' }).click();
  await expect(geojson).toBeChecked();
  await sheet.getByRole('button', { name: '취소', exact: true }).click();
  await expect(sheet).not.toBeVisible();
  const entry = page.getByRole('banner').getByRole('button', { name: '내보내기', exact: true });
  await entry.click();
  await expect(gpx).toBeChecked();
  await sheet.getByRole('button', { name: '완료 화면 미리보기', exact: true }).click();
  await preview.getByRole('button', { name: '확인', exact: true }).click();
  await expect(entry).toBeFocused();
  await expect(page.locator('a[download], input[type="file"]')).toHaveCount(0);
  expect(downloads).toEqual([]);
  expect(apiRequests).toEqual([]);
});

test('편집과 내보내기 패널은 360~1512px에서 스크롤·접기·포커스·지도를 유지한다', async ({
  page,
}) => {
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
    await page.goto('/my-courses/example-ridge-1/edit');
    const map = page.locator('.orda-map-layout__map-surface');
    await expect(map).toHaveAttribute('data-map-ready', 'true');
    await expect(page.getByRole('link', { name: /OpenStreetMap/ })).toBeVisible();
    expect(
      await page.locator('.ol-attribution').evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return element.contains(
          document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2),
        );
      }),
    ).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      viewport.width,
    );
    if (viewport.width === 440 || viewport.width === 1512) {
      await page.screenshot({ path: `test-results/course-edit-${viewport.width}.png` });
    }
    const cancel = page.getByRole('link', { name: '취소', exact: true });
    await cancel.focus();
    await expect(cancel).toBeInViewport();
    if (viewport.width >= 768) {
      const panel = await page.getByRole('complementary', { name: '코스 편집 입력' }).boundingBox();
      const mapBox = await map.boundingBox();
      if (!panel || !mapBox) throw new Error('PC 편집 레이아웃이 없습니다.');
      expect(panel.x + panel.width).toBeLessThanOrEqual(mapBox.x + 1);
    }
    await page.getByRole('button', { name: '패널 접기' }).click();
    await expect(page.getByRole('complementary', { name: '코스 편집 입력' })).not.toBeVisible();
    await page.getByRole('button', { name: '패널 펼치기' }).click();
    await expect(page.getByRole('textbox', { name: '코스 이름' })).toBeVisible();
    await page.getByRole('link', { name: '코스 편집', exact: true }).click();
    await page.getByRole('button', { name: '내보내기', exact: true }).click();
    const sheet = page.getByRole('dialog', { name: '코스 내보내기', exact: true });
    await expect(sheet).toBeInViewport();
    await sheet.getByRole('button', { name: '취소', exact: true }).focus();
    await page.keyboard.press('Tab');
    await expect(sheet.getByRole('button', { name: '내보내기 닫기' })).toBeFocused();
    expect(await sheet.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
      true,
    );
    if (viewport.width === 1512)
      await page.screenshot({ path: 'test-results/course-export-1512.png' });
    await page.keyboard.press('Escape');
    await expect(sheet).not.toBeVisible();
  }
  await page.goto('/my-courses/unknown/edit');
  await expect(page.getByRole('heading', { name: '편집할 코스를 찾을 수 없어요' })).toBeVisible();
  await expect(page.locator('.ol-viewport')).toHaveCount(0);
});

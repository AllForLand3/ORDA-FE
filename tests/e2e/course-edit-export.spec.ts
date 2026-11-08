import { expect, test } from '../fixtures/authenticatedTest';
import { courseListDetail } from '../fixtures/courseList';

const coursePath = `/my-courses/${courseListDetail.courseId}`;

test('Mock 상세의 편집·내보내기 모달은 디자인과 미리보기를 유지하며 서버에 저장하지 않는다', async ({
  page,
}) => {
  const mutations: string[] = [];
  const downloads: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/api/courses') && request.method() !== 'GET')
      mutations.push(request.method());
  });
  page.on('download', (download) => downloads.push(download.suggestedFilename()));
  await page.setViewportSize({ width: 440, height: 956 });
  await page.goto('/my-courses/example-ridge-1');
  await page.getByRole('button', { name: '편집', exact: true }).click();
  const edit = page.getByRole('dialog', { name: /코스 편집/ });
  await expect(edit).toBeVisible();
  const editBox = await edit.boundingBox();
  await edit.getByRole('button', { name: '코스 편집 닫기' }).click();
  await page.getByRole('button', { name: '내보내기', exact: true }).click();
  const sheet = page.getByRole('dialog', { name: '코스 내보내기', exact: true });
  await expect(sheet).toBeVisible();
  const exportBox = await sheet.boundingBox();
  expect(exportBox?.width).toBe(editBox?.width);
  expect(exportBox?.height).toBe(editBox?.height);
  await expect(sheet.getByRole('radio', { name: /^GPX/ })).toBeChecked();
  await sheet.getByRole('radio', { name: /^GeoJSON/ }).check();
  await expect(sheet.getByRole('button', { name: '내보내기', exact: true })).toBeDisabled();
  await sheet.getByRole('button', { name: '완료 화면 미리보기', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(mutations).toEqual([]);
  expect(downloads).toEqual([]);
});

test.beforeEach(async ({ page }) => {
  let saved = { ...courseListDetail };
  let version = 1;
  await page.route('https://*.tile.openstreetmap.org/**', (route) => route.abort());
  await page.route(`**/api/courses/${saved.courseId}`, (route) => {
    if (route.request().method() === 'PATCH') {
      expect(route.request().headers()['if-match']).toBe(`"v${version}"`);
      saved = { ...saved, ...route.request().postDataJSON() };
      version++;
    }
    return route.fulfill({ json: saved, headers: { ETag: `"v${version}"` } });
  });
});

test('코스 이름·메모를 저장하고 초기화·재진입 시 마지막 저장 내용을 유지한다', async ({ page }) => {
  await page.setViewportSize({ width: 440, height: 956 });
  await page.goto(coursePath);
  await page.getByRole('link', { name: '편집', exact: true }).click();
  await expect(page).toHaveURL(`${coursePath}/edit?tab=overview`);
  const name = page.getByRole('textbox', { name: '코스 이름', exact: true });
  const memo = page.getByRole('textbox', { name: '메모', exact: true });
  const save = page.getByRole('button', { name: '저장', exact: true });
  await expect(name).toHaveValue(courseListDetail.courseName);
  await expect(memo).toHaveValue(courseListDetail.memo);
  await name.fill(' ');
  await save.click();
  await expect(name).toHaveAttribute('aria-invalid', 'true');
  await expect(name).toBeFocused();
  await name.fill('저장한 이름');
  await memo.fill('저장한 메모');
  await save.click();
  await expect(page.getByRole('status')).toHaveText('코스를 저장했습니다.');
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
  await reset.getByRole('button', { name: '계속 편집' }).click();
  await expect(memo).toHaveValue('추가 변경');
  await page.getByRole('button', { name: '초기화', exact: true }).click();
  await reset.getByRole('button', { name: '초기화', exact: true }).click();
  await expect(name).toHaveValue('저장한 이름');
  await expect(memo).toHaveValue('저장한 메모');
  await expect(save).toBeDisabled();
  await page.getByRole('link', { name: '취소', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('저장한 이름');
  await page.getByRole('link', { name: '내 코스 목록으로', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(2);
  await page.goto(`${coursePath}/edit`);
  await expect(name).toHaveValue('저장한 이름');
  await expect(memo).toHaveValue('저장한 메모');
});

test('변경 중 취소·브라우저 뒤로가기·새로고침은 유실 확인을 제공한다', async ({ page }) => {
  await page.goto(coursePath);
  await page.getByRole('link', { name: '편집', exact: true }).click();
  const name = page.getByRole('textbox', { name: '코스 이름', exact: true });
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
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(courseListDetail.courseName);
  await page.getByRole('link', { name: '편집', exact: true }).click();
  await name.fill('새로고침하면 사라짐');
  await page.getByRole('button', { name: '패널 접기' }).click();
  await page.getByRole('link', { name: '코스 편집', exact: true }).click();
  await leave.getByRole('button', { name: '계속 편집' }).click();
  await page.getByRole('button', { name: '패널 펼치기' }).click();
  await expect(name).toHaveValue('새로고침하면 사라짐');
  const unload = page.waitForEvent('dialog');
  const reload = page.reload();
  const dialog = await unload;
  expect(dialog.type()).toBe('beforeunload');
  await dialog.accept();
  await reload;
  await expect(name).toHaveValue(courseListDetail.courseName);
});

test('미제공 내보내기는 비활성 상태이며 완료 데모나 다운로드를 제공하지 않는다', async ({
  page,
}) => {
  const downloads: string[] = [];
  page.on('download', (download) => downloads.push(download.suggestedFilename()));
  await page.goto(coursePath);
  await expect(page.getByRole('button', { name: '내보내기', exact: true })).toBeDisabled();
  await expect(page.getByText('내보내기는 아직 제공하지 않습니다.')).toBeVisible();
  await expect(page.getByRole('button', { name: '완료 화면 미리보기' })).toHaveCount(0);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('a[download], input[type="file"]')).toHaveCount(0);
  expect(downloads).toEqual([]);
});

for (const viewport of [
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 440, height: 956 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
  { width: 1512, height: 982 },
]) {
  test(`편집 패널은 ${viewport.width}px에서 스크롤·접기·포커스·지도를 유지한다`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto(`${coursePath}/edit`);
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
    const name = page.getByRole('textbox', { name: '코스 이름', exact: true });
    await expect(name).toBeVisible();
    await name.fill('초기화할 변경');
    const reset = page.getByRole('button', { name: '초기화', exact: true });
    await reset.click();
    const dialog = page.getByRole('dialog', { name: '입력을 초기화할까요?' });
    await expect(dialog).toBeInViewport();
    await dialog.getByRole('button', { name: '초기화', exact: true }).focus();
    await page.keyboard.press('Tab');
    await expect(dialog.getByRole('button', { name: '닫기', exact: true })).toBeFocused();
    expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
      true,
    );
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(reset).toBeFocused();
    await reset.click();
    await dialog.getByRole('button', { name: '초기화', exact: true }).click();
    await page.getByRole('link', { name: '코스 편집', exact: true }).click();
    await expect(page.getByRole('button', { name: '내보내기', exact: true })).toBeDisabled();
  });
}

test('잘못된 편집 ID는 지도 없이 코스 없음으로 표시한다', async ({ page }) => {
  await page.goto('/my-courses/unknown/edit');
  await expect(page.getByRole('heading', { name: '코스를 찾을 수 없어요' })).toBeVisible();
  await expect(page.locator('.ol-viewport')).toHaveCount(0);
});

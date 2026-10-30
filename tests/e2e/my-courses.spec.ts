import type { Page } from '@playwright/test';

import { expect, isDomainApiRequest, test } from '../fixtures/authenticatedTest';

async function selectOption(page: Page, label: string, option: string) {
  await page.getByRole('button', { name: label, exact: true }).click();
  await page.getByRole('option', { name: option, exact: true }).click();
}

test('내 코스는 예시 4+1개를 분류하고 검색·정렬·키보드 탭을 처리한다', async ({ page }) => {
  const apiRequests: string[] = [];

  page.on('request', (request) => {
    if (isDomainApiRequest(request.url())) apiRequests.push(request.url());
  });

  await page.setViewportSize({ width: 440, height: 956 });
  await page.goto('/my-courses');

  await expect(page.getByRole('heading', { name: '내 코스', exact: true })).toBeVisible();
  await expect(page.getByRole('article')).toHaveCount(4);

  await page.getByRole('textbox', { name: '내 코스 검색' }).fill('없는 코스');
  await expect(page.getByText('검색 결과가 없어요', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: '검색 초기화' }).click();
  await expect(page.getByRole('article')).toHaveCount(4);

  await selectOption(page, '코스 정렬', '오래된순');
  await expect(page.getByRole('article').first()).toHaveAccessibleName('능선 조망 코스 · 예시 4');

  await selectOption(page, '코스 정렬', '최신순');
  await expect(page.getByRole('article').first()).toHaveAccessibleName('능선 조망 코스');

  await page.getByRole('tab', { name: /저장한 코스/ }).focus();
  await page.keyboard.press('ArrowRight');

  await expect(page.getByRole('tab', { name: /가져온 코스/ })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.getByRole('article')).toHaveCount(1);
  await expect(
    page.getByRole('heading', { name: '가져온 코스 · 예시', exact: true }),
  ).toBeVisible();

  await page.keyboard.press('Home');
  await expect(page.getByRole('article')).toHaveCount(5);

  await selectOption(page, '코스 정렬', '이름순');
  await page.reload();

  await expect(page.getByRole('button', { name: '코스 정렬', exact: true })).toContainText(
    '이름순',
  );

  expect(apiRequests).toEqual([]);
});

test('카드에서 상세 페이지로 진입하고 목록 조건과 뒤로가기를 유지한다', async ({ page }) => {
  await page.setViewportSize({ width: 440, height: 956 });
  await page.goto('/my-courses?tab=saved&q=예시+2&sort=oldest');

  await page.getByRole('link', { name: '능선 조망 코스 · 예시 2', exact: true }).click();
  await expect(page).toHaveURL(/\/my-courses\/example-ridge-2/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('능선 조망 코스 · 예시 2');

  const map = page.locator('.course-detail-map .orda-map-layout__map-surface');

  await expect(map).toHaveAttribute('data-map-ready', 'true');
  await expect(map).toHaveAttribute('data-map-projection', 'EPSG:3857');
  await expect(page.getByText('분석 미제공', { exact: true })).toBeVisible();

  await page.getByRole('tab', { name: '지형 분석' }).click();
  await page.getByRole('button', { name: '샘플 프로파일 보기' }).click();

  await expect(page.locator('.elevation-profile__chart')).toHaveAttribute(
    'data-chart-ready',
    'true',
  );

  await page.getByRole('tab', { name: '주변 시설' }).click();

  await expect(
    page.getByRole('heading', { name: '능선 조망 코스 · 예시 2 주변 시설' }),
  ).toBeVisible();

  await page.getByRole('link', { name: '내 코스 목록으로', exact: true }).click();

  await expect(page).toHaveURL(/\/my-courses(?:\?.*)?$/);
  await expect(page.getByRole('heading', { name: '내 코스', exact: true })).toBeVisible();
  await expect(page.getByRole('textbox', { name: '내 코스 검색' })).toHaveValue('예시 2');

  await expect(page.getByRole('button', { name: '코스 정렬', exact: true })).toContainText(
    '오래된순',
  );

  await page.getByRole('link', { name: '코스 상세 보기', exact: true }).click();

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('능선 조망 코스 · 예시 2');
  await expect(map).toHaveAttribute('data-map-ready', 'true');

  await page.goBack();

  await expect(page.getByRole('textbox', { name: '내 코스 검색' })).toHaveValue('예시 2');
  await expect(page.getByRole('button', { name: '코스 정렬', exact: true })).toContainText(
    '오래된순',
  );
});

test('뒤로가기와 앞으로가기로 변경된 검색어를 입력창과 목록에 동기화한다', async ({ page }) => {
  await page.goto('/my-courses?q=예시+2');

  const search = page.getByRole('textbox', { name: '내 코스 검색' });

  await expect(search).toHaveValue('예시 2');
  await expect(page.getByRole('article')).toHaveCount(1);

  await search.fill('예시 3');
  await expect(page).toHaveURL(/q=%EC%98%88%EC%8B%9C(?:\+|%20)3/);
  await expect(page.getByRole('article')).toHaveCount(1);

  await page.evaluate(() => {
    const next = new URL(window.location.href);
    next.searchParams.set('q', '예시 4');
    window.history.pushState({}, '', next);
    window.dispatchEvent(new PopStateEvent('popstate'));
  });

  await expect(search).toHaveValue('예시 4');
  await expect(page.getByRole('article')).toHaveCount(1);

  await page.goBack();
  await expect(search).toHaveValue('예시 3');

  await page.goForward();
  await expect(search).toHaveValue('예시 4');
});

test('빈 목록·목록 오류·잘못된 상세 ID를 구분하고 업로드 안내만 제공한다', async ({ page }) => {
  await page.goto('/my-courses');

  const upload = page.getByRole('button', { name: '코스 업로드', exact: true });

  await upload.click();
  await expect(page.getByRole('dialog', { name: '코스 업로드 준비 중' })).toBeVisible();
  await expect(page.locator('input[type="file"]')).toHaveCount(0);

  await page.keyboard.press('Escape');
  await expect(upload).toBeFocused();

  const firstCard = page.getByRole('article').first();
  const edit = firstCard.getByRole('link', { name: '편집', exact: true });
  const exportCourse = firstCard.getByRole('link', { name: '내보내기', exact: true });
  const remove = firstCard.getByRole('button', { name: '삭제', exact: true });

  await expect(remove).toHaveAttribute('aria-disabled', 'true');
  await expect(edit).toHaveCSS('color', 'rgb(116, 129, 124)');
  await expect(exportCourse).toHaveCSS('color', 'rgb(116, 129, 124)');

  await edit.focus();
  await expect(edit).toHaveCSS('color', 'rgb(7, 92, 71)');

  await exportCourse.focus();
  await expect(exportCourse).toHaveCSS('color', 'rgb(7, 92, 71)');

  await remove.focus();
  await expect(remove).toHaveCSS('color', 'rgb(159, 45, 28)');

  expect(
    await exportCourse.evaluate((element) => getComputedStyle(element, '::before').backgroundColor),
  ).toBe('rgb(160, 170, 166)');

  await selectOption(page, '내 코스 목록 상태', '빈 목록 데모');

  await expect(page.getByText('표시할 코스가 없어요', { exact: true })).toBeVisible();
  await expect(page.getByRole('article')).toHaveCount(0);

  await selectOption(page, '내 코스 목록 상태', '오류 데모');

  await expect(page.getByRole('alert')).toContainText('코스 목록을 표시하지 못했어요');

  await page.getByRole('button', { name: '예시 목록 다시 보기' }).click();
  await expect(page.getByRole('article')).toHaveCount(4);

  await page.goto('/my-courses/unknown-example');
  await expect(page.getByRole('heading', { name: '코스를 찾을 수 없어요' })).toBeVisible();
  await expect(page.locator('.ol-viewport')).toHaveCount(0);

  await page.goto('/my-courses/example-ridge-1?preview=error');
  await expect(page.getByRole('alert')).toContainText('코스 상세를 표시하지 못했어요');

  await page.getByRole('button', { name: '예시 상세 다시 보기' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('능선 조망 코스');
});

test('목록과 상세는 360~1512px에서 넘치지 않으며 지도와 내비게이션이 동작한다', async ({
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
    await page.goto('/my-courses');

    await expect(page.getByRole('article')).toHaveCount(4);

    const navigation = page.getByRole('navigation', { name: '내 코스 내비게이션' });

    if (viewport.width < 768) {
      await expect(navigation).toBeVisible();
    } else {
      await expect(navigation).not.toBeVisible();
    }

    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      viewport.width,
    );

    expect(
      await page
        .locator('.my-course-card__image')
        .evaluateAll((elements) =>
          elements.every(
            (element) =>
              element instanceof HTMLImageElement && element.complete && element.naturalWidth > 0,
          ),
        ),
    ).toBe(true);

    if (viewport.width === 440 || viewport.width === 1512) {
      await page.screenshot({ path: `test-results/my-courses-${viewport.width}.png` });
    }

    await page.getByRole('link', { name: '코스 상세 보기', exact: true }).first().click();

    const map = page.locator('.course-detail-map .orda-map-layout__map-surface');

    await expect(map).toHaveAttribute('data-map-ready', 'true');

    const zoom = page.getByRole('button', { name: '+', exact: true });
    await zoom.click();

    await expect(map).toHaveAttribute('data-map-zoom', '15');

    const attributionUncovered = await page.locator('.ol-attribution').evaluate((element) => {
      const rect = element.getBoundingClientRect();

      return element.contains(
        document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2),
      );
    });

    expect(attributionUncovered).toBe(true);

    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      viewport.width,
    );

    if (viewport.width === 440 || viewport.width === 1512) {
      await page.screenshot({
        path: `test-results/my-course-detail-${viewport.width}.png`,
      });
    }

    if (viewport.width >= 768) {
      const content = await page.locator('.course-detail-content').boundingBox();
      const mapBox = await map.boundingBox();

      if (!content || !mapBox) {
        throw new Error('PC 상세 레이아웃이 없습니다.');
      }

      expect(content.x + content.width).toBeLessThanOrEqual(mapBox.x + 1);
    }

    if (viewport.width < 768) {
      await navigation.getByRole('link', { name: '내 코스' }).click();
    } else {
      await page.getByRole('link', { name: '내 코스 목록으로', exact: true }).click();
    }

    await expect(page).toHaveURL(/\/my-courses$/);
  }

  await page.goto('/mountains');

  await page.getByRole('link', { name: '내 코스', exact: true }).click();
  await expect(page.getByRole('heading', { name: '내 코스', exact: true })).toBeVisible();

  await page.goto('/routes/results');

  await page.getByRole('link', { name: '내 코스', exact: true }).click();
  await expect(page.getByRole('heading', { name: '내 코스', exact: true })).toBeVisible();
});

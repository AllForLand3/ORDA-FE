import { expect, test } from '@playwright/test';

test('분석 결측과 독립적인 샘플을 구분하고 축·툴팁·표에 단위를 표시한다', async ({ page }) => {
  const apiRequests: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/api/')) apiRequests.push(request.url());
  });
  await page.setViewportSize({ width: 440, height: 956 });
  await page.goto('/routes/results?tab=terrain');
  await expect(page.getByText('분석 미제공', { exact: true })).toBeVisible();
  await expect(page.locator('.elevation-profile__chart')).toHaveCount(0);
  const metrics = page.getByRole('region', { name: '코스 지표 미제공' });
  await expect(metrics.locator('dd')).toHaveText([
    '— 미제공 km',
    '— 미제공 m',
    '— 미제공 m',
    '— / — 미제공 m',
  ]);
  await expect(metrics.locator('.sr-only')).toHaveText(['미제공', '미제공', '미제공', '미제공']);
  await page.getByRole('button', { name: '샘플 프로파일 보기' }).click();
  const chart = page.locator('.elevation-profile__chart');
  await expect(chart).toHaveAttribute('data-chart-ready', 'true');
  await expect(chart.locator('svg')).toHaveCount(1);
  await expect(chart).toContainText('거리 (km)');
  await expect(chart).toContainText('고도 (m)');
  await expect(chart).toContainText('샘플 고도');
  const box = await chart.boundingBox();
  if (!box) throw new Error('샘플 차트가 표시되지 않았습니다.');
  await page.mouse.move(box.x + 42 + ((box.width - 58) * 4100) / 5800, box.y + 100);
  await expect(chart).toContainText('샘플 고도 528m');
  await expect(metrics.locator('dd')).toHaveText([
    '— 미제공 km',
    '— 미제공 m',
    '— 미제공 m',
    '— / — 미제공 m',
  ]);
  await page.getByText('샘플 데이터 표 보기', { exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('columnheader', { name: '거리 (m)' })).toBeVisible();
  await expect(page.getByRole('cell', { name: '5800', exact: true })).toHaveCount(1);
  expect(apiRequests).toEqual([]);
});

test('활성 차트는 resize에 맞춰지고 탭 전환·화면 이탈 시 실제 인스턴스를 dispose한다', async ({
  page,
}) => {
  await page.goto('/routes/results?tab=terrain');
  await page.getByRole('button', { name: '샘플 프로파일 보기' }).click();
  const chart = page.locator('.elevation-profile__chart');
  await expect(chart).toHaveAttribute('data-chart-ready', 'true');
  for (const viewport of [
    { width: 360, height: 800 },
    { width: 768, height: 1024 },
    { width: 1024, height: 768 },
    { width: 1512, height: 982 },
  ]) {
    await page.setViewportSize(viewport);
    await expect
      .poll(async () =>
        chart.evaluate((element) =>
          Math.abs(element.clientWidth - Number(element.dataset.chartWidth)),
        ),
      )
      .toBeLessThanOrEqual(1);
    await expect(chart.locator('svg')).toHaveCount(1);
    const geometry = await chart.evaluate((element) => ({
      hostWidth: element.clientWidth,
      svgWidth: Number(element.querySelector('svg')?.getAttribute('width')),
      documentWidth: document.documentElement.scrollWidth,
    }));
    expect(geometry.hostWidth).toBeGreaterThan(200);
    expect(Math.abs(geometry.svgWidth - geometry.hostWidth)).toBeLessThanOrEqual(1);
    expect(geometry.documentWidth).toBeLessThanOrEqual(viewport.width);
  }

  for (let i = 0; i < 3; i += 1) {
    const previous = await chart.elementHandle();
    if (!previous) throw new Error('검증할 차트 DOM이 없습니다.');
    expect(await previous.getAttribute('_echarts_instance_')).toBeTruthy();
    await page.getByRole('tab', { name: '코스 비교' }).click();
    await expect(chart).toHaveCount(0);
    await expect.poll(() => previous.getAttribute('_echarts_instance_')).toBe('');
    await page.getByRole('tab', { name: '지형 분석' }).click();
    await expect(page.getByText('분석 미제공', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: '샘플 프로파일 보기' }).click();
    await expect(chart).toHaveAttribute('data-chart-ready', 'true');
    await expect(chart.locator('svg')).toHaveCount(1);
    await previous.dispose();
  }
  const last = await chart.elementHandle();
  if (!last) throw new Error('화면 이탈 전 차트 DOM이 없습니다.');
  await page.getByRole('link', { name: '← 조건 변경' }).click();
  await expect.poll(() => last.getAttribute('_echarts_instance_')).toBe('');
  await last.dispose();
});

test('시설 한 항목만 예시로 제공하고 상세 결측·빈 목록·미제공 상태를 구분한다', async ({
  page,
}) => {
  await page.setViewportSize({ width: 440, height: 956 });
  await page.goto('/routes/results?tab=facilities&candidate=example-valley');
  await expect(page.getByRole('heading', { name: '계곡 완만 코스 주변 시설' })).toBeVisible();
  await expect(page.getByText('예시 항목 1개 · 거리 정보 미제공')).toBeVisible();
  await expect(page.locator('.nearby-facility-card')).toHaveCount(1);
  await expect(page.getByRole('heading', { name: '제 1광장 화장실' })).toBeVisible();
  await page.getByText('시설 상세 보기', { exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.nearby-facility-card dd')).toHaveText([
    '미제공',
    '미제공',
    '미제공',
    '미제공',
  ]);
  const preview = page.getByRole('combobox', { name: '시설 화면 상태' });
  await preview.selectOption('empty');
  await expect(page.getByText('표시할 시설이 없어요')).toBeVisible();
  await expect(
    page.getByText('빈 목록 UI 데모입니다. 실제로 주변에 시설이 없다는 뜻은 아닙니다.'),
  ).toBeVisible();
  await expect(page.locator('.nearby-facility-card')).toHaveCount(0);
  await preview.selectOption('missing');
  await expect(page.getByText('시설 데이터가 연결되지 않았어요')).toBeVisible();
  await preview.selectOption('sample');
  await expect(page.getByRole('heading', { name: '제 1광장 화장실' })).toBeVisible();
  await page.getByRole('tab', { name: '코스 비교' }).click();
  await page.getByRole('button', { name: '예시 코스 1: 능선 조망 코스 선택' }).click();
  await page.getByRole('tab', { name: '주변 시설' }).click();
  await expect(page.getByRole('heading', { name: '능선 조망 코스 주변 시설' })).toBeVisible();
});

test('440px 원본·확장 및 PC를 캡처하고 작은 화면에서 표·시설 상세를 스크롤한다', async ({
  page,
}) => {
  await page.setViewportSize({ width: 440, height: 956 });
  await page.goto('/routes/results?tab=terrain');
  await expect(page.getByText('분석 미제공', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/terrain-missing-440x956.png' });
  await page.getByRole('button', { name: '샘플 프로파일 보기' }).click();
  await expect(page.locator('.elevation-profile__chart')).toHaveAttribute(
    'data-chart-ready',
    'true',
  );
  for (const viewport of [
    { width: 440, height: 956 },
    { width: 440, height: 1535 },
    { width: 1512, height: 982 },
  ]) {
    await page.setViewportSize(viewport);
    await page
      .locator('.orda-responsive-panel__content')
      .evaluate((element) => element.scrollTo(0, 0));
    await expect
      .poll(async () =>
        page
          .locator('.elevation-profile__chart')
          .evaluate((element) =>
            Math.abs(element.clientWidth - Number(element.dataset.chartWidth)),
          ),
      )
      .toBeLessThanOrEqual(1);
    await page.screenshot({
      path: `test-results/terrain-sample-${viewport.width}x${viewport.height}.png`,
    });
    const geometry = await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
    }));
    expect(geometry.width).toBeLessThanOrEqual(geometry.viewport);
  }
  await page.setViewportSize({ width: 360, height: 640 });
  await page.getByText('샘플 데이터 표 보기', { exact: true }).click();
  const lastCell = page.getByRole('cell', { name: '5800', exact: true });
  await lastCell.scrollIntoViewIfNeeded();
  await expect(lastCell).toBeVisible();
  const content = page.locator('.orda-responsive-panel__content');
  expect(await content.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(
    true,
  );
  await page.getByRole('tab', { name: '주변 시설' }).click();
  await page.getByText('시설 상세 보기', { exact: true }).click();
  const disclaimer = page.getByText(
    '디자인 확인을 위한 예시 항목입니다. 운영 여부와 이용 조건이 확인되지 않아 길찾기·지도 위치 표시를 제공하지 않습니다.',
  );
  await disclaimer.scrollIntoViewIfNeeded();
  await expect(disclaimer).toBeVisible();
  for (const viewport of [
    { width: 440, height: 956 },
    { width: 1512, height: 982 },
  ]) {
    await page.setViewportSize(viewport);
    await content.evaluate((element) => element.scrollTo(0, 0));
    await page.screenshot({ path: `test-results/facilities-${viewport.width}.png` });
  }
});

import type { Page } from '@playwright/test';
import type {
  TerrainAnalysisResponse,
  TerrainAnalysisSample,
} from '../../src/features/analysis/types/terrainAnalysis';

import { expect, test } from '../fixtures/authenticatedTest';

const result = {
  analysisId: '6',
  courseId: '6',
  revNo: 1,
  demId: '1',
  demName: '테스트 DEM',
  resolutionM: 30,
  sampleIntervalM: 25,
  status: 'DONE',
  analysis: {
    ascentM: 1,
    descentM: 0,
    maxElevationM: 2,
    minElevationM: 1,
    sampleCount: 2,
    missingCount: 0,
  },
  samples: [
    { seqNo: 1, distanceM: 0, elevationM: 1 },
    { seqNo: 2, distanceM: 25, elevationM: 2 },
  ],
  completedAt: '2026-11-02T00:00:00Z',
  failure: null,
};
const running = { ...result, status: 'RUNNING', analysis: null, samples: [], completedAt: null };

async function navigate(page: Page, id: string) {
  await page.evaluate((value) => {
    history.pushState({}, '', `/my-courses/${value}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, id);
  await expect(
    page.getByRole('heading', { name: `코스 ${id}`, exact: true, level: 1 }),
  ).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.route(/\/api\/courses\/[67]$/, async (route) => {
    const id = new URL(route.request().url()).pathname.split('/').pop();
    await route.fulfill({
      json: {
        courseId: id,
        mountainId: '1',
        courseName: `코스 ${id}`,
        memo: '',
        createType: 'IMPORT',
        revNo: 1,
        geometry: {
          type: 'LineString',
          coordinates: [
            [126.96, 37.44],
            [126.97, 37.45],
          ],
        },
        lengthM: 25,
      },
    });
  });
});

test('완료 응답을 보관하고 탭 전환 후에도 POST를 다시 실행하지 않는다', async ({ page }) => {
  let posts = 0;
  await page.route('**/api/courses/6/elevation-profile?*', async (route) => {
    if (posts === 0) {
      await route.fulfill({
        status: 404,
        json: {
          status: 404,
          code: 'RESOURCE_NOT_FOUND',
          message: '현재 조건의 분석 결과가 없습니다.',
        },
      });
      return;
    }

    await route.fulfill({ json: result });
  });
  await page.route('**/api/courses/6/terrain-analyses', async (route) => {
    posts++;
    expect(route.request().postDataJSON()).toEqual({ demId: '1', revNo: 1, sampleIntervalM: 25 });
    expect(route.request().headers().authorization).toBe('Bearer e2e-access-token');
    await route.fulfill({ json: result });
  });
  await page.goto('/my-courses/6');
  await expect(page.getByRole('region', { name: '고도 분석 결과', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: '고도 분석하기', exact: true }).click();
  await expect(page.getByText('고도 분석이 완료됐어요', { exact: true })).toBeVisible();
  const completedPanel = page.getByRole('region', { name: '고도 분석 결과', exact: true });
  await expect(completedPanel).toBeVisible();
  await expect(completedPanel.getByText('테스트 DEM', { exact: true })).toBeVisible();
  await expect(completedPanel.getByText('30 m', { exact: true })).toBeVisible();
  await expect(completedPanel.getByText('25 m', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: '지형 분석', exact: true }).click();
  await expect(page.getByText('고도 분석이 완료됐어요', { exact: true })).toBeVisible();
  await expect(completedPanel).toBeVisible();
  await navigate(page, '7');
  await expect(completedPanel).toHaveCount(0);
  await navigate(page, '6');
  await expect(page.getByText('고도 분석이 완료됐어요', { exact: true })).toBeVisible();
  expect(posts).toBe(1);
});

test('완료 결과 보관 후 재진입 조회가 404이면 미분석으로 되돌리거나 POST를 반복하지 않는다', async ({
  page,
}) => {
  let posts = 0;
  // 공통 프로파일 스텁은 최초 진입과 재진입 모두 RESOURCE_NOT_FOUND를 반환한다.
  await page.route('**/api/courses/6/terrain-analyses', async (route) => {
    posts++;
    await route.fulfill({ json: result });
  });
  await page.goto('/my-courses/6');
  await page.getByRole('button', { name: '고도 분석하기', exact: true }).click();
  await expect(page.getByText('고도 분석이 완료됐어요', { exact: true })).toBeVisible();
  await navigate(page, '7');
  await navigate(page, '6');
  // 요약 탭은 설명을 접으므로 상세 안내를 제공하는 지형 분석 탭에서 검증한다.
  await page.getByRole('tab', { name: '지형 분석', exact: true }).click();
  await expect(
    page.getByText('해당 조건의 결과를 찾지 못했어요. 분석 완료 여부를 확인할 수 없어요.', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByText('고도 분석이 완료됐어요', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('region', { name: '고도 분석 결과', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '고도 분석하기', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '결과 다시 확인', exact: true })).toBeEnabled();
  expect(posts).toBe(1);
});

test('진행 응답 이후 조회로 완료된다', async ({ page }) => {
  await page.route('**/api/courses/6/terrain-analyses', async (route) => {
    await route.fulfill({ status: 202, json: running });
  });
  await page.route('**/api/terrain-analyses/6', async (route) => {
    await route.fulfill({ json: result });
  });
  await page.goto('/my-courses/6');
  await page.getByRole('button', { name: '고도 분석하기', exact: true }).click();
  await expect(page.getByText('고도 분석이 진행 중이에요', { exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: '고도 분석 결과', exact: true })).toHaveCount(0);
  await expect(page.getByText('고도 분석이 완료됐어요', { exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: '고도 분석 결과', exact: true })).toBeVisible();
});

for (const invalidResult of [
  { ...result, revNo: 2 },
  { ...result, analysis: null },
  { ...result, status: 'FAILED', analysis: null, samples: [] },
]) {
  test(`조건 불일치·통계 누락·실패 결과를 표시하지 않는다 ${invalidResult.status}-${invalidResult.revNo}-${invalidResult.analysis === null}`, async ({
    page,
  }) => {
    await page.route('**/api/courses/6/terrain-analyses', async (route) => {
      await route.fulfill({ json: invalidResult });
    });
    await page.goto('/my-courses/6');
    await page.getByRole('button', { name: '고도 분석하기', exact: true }).click();
    await page.getByRole('tab', { name: '지형 분석', exact: true }).click();
    await expect(
      page.getByRole('button', {
        name: invalidResult.status === 'FAILED' ? '다시 시도' : '결과 다시 확인',
        exact: true,
      }),
    ).toBeEnabled();
    await expect(page.getByRole('region', { name: '고도 분석 결과', exact: true })).toHaveCount(0);
  });
}

test('진행 중 코스를 바꿨다가 돌아와도 종료된 조회를 진행 중으로 표시하지 않는다', async ({
  page,
}) => {
  let gets = 0;
  await page.route('**/api/courses/6/terrain-analyses', async (route) => {
    await route.fulfill({ status: 202, json: running });
  });
  await page.route('**/api/terrain-analyses/6', async (route) => {
    gets++;
    await route.fulfill({ json: running });
  });
  await page.goto('/my-courses/6');
  await page.getByRole('button', { name: '고도 분석하기', exact: true }).click();
  await expect(page.getByText('고도 분석이 진행 중이에요', { exact: true })).toBeVisible();
  await navigate(page, '7');
  await navigate(page, '6');
  await expect(page.getByText('분석 결과를 확인하지 못했어요', { exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: '코스 고도 분석', exact: true })).toHaveAttribute(
    'aria-busy',
    'false',
  );
  const before = gets;
  // 실제 조회 간격보다 길게 기다려 취소된 조회가 다시 실행되지 않는지 확인한다.
  await page.waitForTimeout(2_500);
  expect(gets).toBe(before);
});

test('POST 응답 대기 중에는 중복 클릭을 막고 늦은 응답은 다른 코스에 반영하지 않는다', async ({
  page,
}) => {
  let release = () => {};
  const ready = new Promise<void>((resolve) => {
    release = resolve;
  });
  let posts = 0;
  await page.route('**/api/courses/6/terrain-analyses', async (route) => {
    posts++;
    await ready;
    await route.fulfill({ json: result });
  });
  await page.goto('/my-courses/6');
  await page.getByRole('button', { name: '고도 분석하기', exact: true }).click();
  try {
    await expect(page.getByRole('button', { name: '분석 중…', exact: true })).toBeDisabled();
    await navigate(page, '7');
  } finally {
    release();
  }
  await expect(page.getByRole('button', { name: '고도 분석하기', exact: true })).toBeEnabled();
  await expect(page.getByText('고도 분석이 완료됐어요', { exact: true })).toHaveCount(0);
  await navigate(page, '6');
  await expect(page.getByRole('region', { name: '코스 고도 분석', exact: true })).toHaveAttribute(
    'aria-busy',
    'false',
  );
  expect(posts).toBe(1);
});

test.beforeEach(async ({ page }) => {
  await page.route('**/api/courses/*/elevation-profile?*', async (route) => {
    await route.fulfill({
      status: 404,
      json: {
        status: 404,
        code: 'RESOURCE_NOT_FOUND',
        message: '현재 조건의 분석 결과가 없습니다.',
      },
    });
  });
});

// 아래 시나리오는 테스트 본문에서 공통 404 스텁보다 나중에 완료 응답을 등록한다.
const probePath = '/tests/fixtures/terrainChartProbe.ts';

async function readProfileChart(page: Page) {
  return page.evaluate(async (path) => {
    const probe: typeof import('../fixtures/terrainChartProbe') = await import(path);
    return probe.readChart();
  }, probePath);
}

async function showCompletedProfile(
  page: Page,
  samples: TerrainAnalysisSample[],
  summary: TerrainAnalysisResponse['analysis'],
) {
  let posts = 0;
  await page.route('**/api/courses/6/elevation-profile?*', async (route) => {
    await route.fulfill({ json: { ...result, samples, analysis: summary } });
  });
  await page.route('**/api/courses/6/terrain-analyses', async (route) => {
    posts++;
    await route.fulfill({ status: 500, json: { code: 'UNEXPECTED_POST' } });
  });
  await page.goto('/my-courses/6?tab=terrain');
  await expect(page.locator('.elevation-profile__chart svg')).toBeVisible();
  await expect(page.locator('.elevation-profile__chart')).toHaveAttribute(
    'data-chart-ready',
    'true',
  );
  return () => posts;
}

const gapCases = [
  { name: '부분 결측', elevations: [100, 110, null, 120, 130], segments: 2 },
  { name: '연속 결측', elevations: [100, 110, null, null, 120, 130], segments: 2 },
  { name: '시작·끝 결측과 고립된 점', elevations: [null, 100, 120, null, 110, null], segments: 2 },
];

for (const scenario of gapCases) {
  test(`${scenario.name}: 샘플·거리 범위를 유지하고 결측 선을 연결하지 않는다`, async ({
    page,
  }) => {
    const samples = scenario.elevations.map((elevationM, index) => ({
      seqNo: index + 1,
      distanceM: index * 25,
      elevationM,
    }));
    const valid = scenario.elevations.filter((value): value is number => value !== null);
    const missingCount = samples.length - valid.length;
    await showCompletedProfile(page, samples, {
      // 이 세 데이터는 연속된 100→110 또는 100→120 구간만 상승량에 기여한다.
      ascentM: 20,
      descentM: 0,
      minElevationM: Math.min(...valid),
      maxElevationM: Math.max(...valid),
      sampleCount: samples.length,
      missingCount,
    });
    const chart = await readProfileChart(page);
    expect(chart.data).toEqual(samples.map((sample) => [sample.distanceM, sample.elevationM]));
    expect(chart.connectNulls).toBe(false);
    expect(chart.min).toBe(0);
    expect(chart.max).toBe(samples[samples.length - 1].distanceM);
    // SVG의 move 명령은 끊어진 선의 시작을 나타낸다. 하나의 연속 선이면 실패한다.
    expect(chart.linePaths.join(' ').match(/[Mm]/g)?.length).toBe(scenario.segments);
    expect(chart.linePaths.join(' ')).not.toMatch(/NaN|Infinity/);
    await page.getByText('고도 데이터 표 보기', { exact: true }).click();
    const rows = page.locator('.elevation-profile__table tbody tr');
    await expect(rows).toHaveCount(samples.length);
    await expect(
      page.locator('.elevation-profile__table td', { hasText: '고도 미제공' }),
    ).toHaveCount(missingCount);
    await expect(
      page.getByText(`전체 ${samples.length}개 중 고도 미제공 ${missingCount}개`, { exact: true }),
    ).toBeVisible();
    for (let index = 0; index < samples.length; index++) {
      await expect(rows.nth(index).locator('td').first()).toHaveText(
        String(samples[index].distanceM),
      );
    }
  });
}

for (const elevationM of [0, 100]) {
  test(`동일 고도 ${elevationM}m를 결측으로 바꾸지 않고 표시한다`, async ({ page }) => {
    const samples = [0, 25, 50].map((distanceM, index) => ({
      seqNo: index + 1,
      distanceM,
      elevationM,
    }));
    await showCompletedProfile(page, samples, {
      ascentM: 0,
      descentM: 0,
      minElevationM: elevationM,
      maxElevationM: elevationM,
      sampleCount: 3,
      missingCount: 0,
    });
    const chart = await readProfileChart(page);
    expect(chart.data).toEqual(samples.map((sample) => [sample.distanceM, elevationM]));
    expect(chart.linePaths.length).toBeGreaterThan(0);
    expect(chart.linePaths.join(' ')).not.toMatch(/NaN|Infinity/);
    await expect(page.getByRole('definition').filter({ hasText: /^0 m$/ })).toHaveCount(
      elevationM === 0 ? 4 : 2,
    );
    await page.getByText('고도 데이터 표 보기', { exact: true }).click();
    await expect(page.locator('.elevation-profile__table tbody tr')).toHaveCount(3);
    await expect(page.locator('.elevation-profile__table tbody')).not.toContainText('고도 미제공');
  });
}

for (const width of [360, 390, 1280]) {
  test(`${width}px에서 통계·차트가 넘치지 않고 탭 전환·크기 변경에 대응한다`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const posts = await showCompletedProfile(page, result.samples, result.analysis);
    for (const tab of ['코스 비교', '지형 분석']) {
      await page.getByRole('tab', { name: tab, exact: true }).click();
      await expect(page.locator('.elevation-profile__chart svg')).toBeVisible();
      await expect
        .poll(async () => {
          const chart = await readProfileChart(page);
          return chart.width > 0 && Math.abs(chart.width - chart.containerWidth) <= 1;
        })
        .toBe(true);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
      ).toBe(true);
      for (const element of await page
        .locator('.terrain-analysis__metrics dd, .terrain-analysis__criteria dd')
        .all()) {
        await expect(element).toBeVisible();
        expect(await element.evaluate((node) => node.scrollWidth <= node.clientWidth + 1)).toBe(
          true,
        );
      }
    }
    await page.setViewportSize({ width: width === 1280 ? 390 : 1280, height: 900 });
    await expect
      .poll(async () => {
        const chart = await readProfileChart(page);
        return chart.width > 0 && Math.abs(chart.width - chart.containerWidth) <= 1;
      })
      .toBe(true);
    expect(posts()).toBe(0);
  });
}

test('2,000개 샘플 전체와 툴팁을 표시하고 탭 전환 후에도 유지한다', async ({ page }) => {
  const samples = Array.from({ length: 2000 }, (_, index) => ({
    seqNo: index + 1,
    distanceM: index * 25,
    elevationM: index % 2 === 0 ? 100 : 101,
  }));
  const posts = await showCompletedProfile(page, samples, {
    ascentM: 1000,
    descentM: 999,
    minElevationM: 100,
    maxElevationM: 101,
    sampleCount: 2000,
    missingCount: 0,
  });
  await page.getByText('고도 데이터 표 보기', { exact: true }).click();
  const rows = page.locator('.elevation-profile__table tbody tr');
  await expect(rows).toHaveCount(2000);
  await expect(rows.first().locator('td').first()).toHaveText('0');
  await expect(rows.last().locator('td').first()).toHaveText('49,975');
  for (const tab of ['코스 비교', '지형 분석']) {
    await page.getByRole('tab', { name: tab, exact: true }).click();
    await expect(page.locator('.elevation-profile__chart svg')).toBeVisible();
    expect((await readProfileChart(page)).data).toHaveLength(2000);
  }
  // 실제 툴팁 formatter와 SVG 렌더링을 검증하되 마우스 좌표에는 의존하지 않는다.
  await page.evaluate(async (path) => {
    const probe: typeof import('../fixtures/terrainChartProbe') = await import(path);
    probe.captureChart().chart.dispatchAction({ type: 'showTip', seriesIndex: 0, dataIndex: 1999 });
  }, probePath);
  await expect(page.locator('.elevation-profile__chart svg')).toContainText('거리 49,975 m');
  await expect(page.locator('.elevation-profile__chart svg')).toContainText('고도 101 m');
  expect(posts()).toBe(0);
});

test('탭 이탈·코스 이동 시 차트와 크기 감지·resize 리스너를 정리한다', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    const observers = new Set<ResizeObserver>();
    const listeners = new Set<unknown>();
    let expectingChartResizeListener = false;
    const NativeObserver = window.ResizeObserver;
    window.ResizeObserver = class extends NativeObserver {
      observe(target: Element, options?: ResizeObserverOptions) {
        if (target.classList.contains('elevation-profile__chart')) {
          observers.add(this);
          expectingChartResizeListener = true;
        }
        super.observe(target, options);
      }
      disconnect() {
        observers.delete(this);
        super.disconnect();
      }
    };
    window.addEventListener = new Proxy(window.addEventListener, {
      apply(target, thisArg, args) {
        if (args[0] === 'resize' && expectingChartResizeListener) {
          listeners.add(args[1]);
          expectingChartResizeListener = false;
        }
        return Reflect.apply(target, thisArg, args);
      },
    });
    window.removeEventListener = new Proxy(window.removeEventListener, {
      apply(target, thisArg, args) {
        if (args[0] === 'resize') listeners.delete(args[1]);
        return Reflect.apply(target, thisArg, args);
      },
    });
    const state = window as Window & {
      __terrainResources: () => { observers: number; listeners: number };
    };
    state.__terrainResources = () => ({ observers: observers.size, listeners: listeners.size });
  });
  await showCompletedProfile(page, result.samples, result.analysis);
  for (const destination of ['facilities', 'course']) {
    await expect
      .poll(() =>
        page.evaluate(() => {
          const state = window as Window & {
            __terrainResources: () => { observers: number; listeners: number };
          };
          return state.__terrainResources();
        }),
      )
      .toEqual({ observers: 1, listeners: 1 });
    const previous = await page.evaluateHandle(async (path) => {
      const probe: typeof import('../fixtures/terrainChartProbe') = await import(path);
      return probe.captureChart();
    }, probePath);
    try {
      if (destination === 'facilities') {
        await page.getByRole('tab', { name: '주변 시설', exact: true }).click();
      } else {
        await navigate(page, '7');
      }
      await expect(page.locator('.elevation-profile__chart')).toHaveCount(0);
      await expect
        .poll(() =>
          previous.evaluate(({ chart, element }) => ({
            disposed: chart.isDisposed(),
            ready: element.dataset.chartReady ?? null,
            width: element.dataset.chartWidth ?? null,
          })),
        )
        .toEqual({ disposed: true, ready: null, width: null });
      await expect
        .poll(() =>
          page.evaluate(() => {
            const state = window as Window & {
              __terrainResources: () => { observers: number; listeners: number };
            };
            return state.__terrainResources();
          }),
        )
        .toEqual({ observers: 0, listeners: 0 });
    } finally {
      await previous.dispose();
    }
    if (destination === 'facilities') {
      await page.getByRole('tab', { name: '지형 분석', exact: true }).click();
      await expect(page.locator('.elevation-profile__chart svg')).toBeVisible();
    }
  }
  expect(errors).toEqual([]);
});

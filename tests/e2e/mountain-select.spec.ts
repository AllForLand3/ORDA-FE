import type { Page } from '@playwright/test';

import { expect, test } from '../fixtures/authenticatedTest';

const MOUNTAINS = [
  {
    mountainId: '1',
    mountainName: '관악산',
    addressLabel: '서울특별시 관악구',
    provinceName: '서울특별시',
    districtName: '관악구',
    elevationMeters: 629,
    geometry: { type: 'Point', coordinates: [126.96444, 37.44472] },
  },
  {
    mountainId: '2',
    mountainName: '북한산',
    addressLabel: '서울특별시 강북구',
    provinceName: '서울특별시',
    districtName: '강북구',
    elevationMeters: 836,
    geometry: { type: 'Point', coordinates: [126.978, 37.65863] },
  },
  {
    mountainId: '3',
    mountainName: '청계산',
    addressLabel: '경기도 과천시',
    provinceName: '경기도',
    districtName: '과천시',
    elevationMeters: 618,
    geometry: { type: 'Point', coordinates: [127.0543676446, 37.4416867721] },
  },
];

const MOUNTAIN_DETAILS = {
  '1': {
    ...MOUNTAINS[0],
    sourceMountainCode: 'MNT-001',
    sourceOldMountainCode: 'OLD-001',
    serviceAvailable: true,
  },
  '2': {
    ...MOUNTAINS[1],
    sourceMountainCode: 'MNT-002',
    sourceOldMountainCode: null,
    serviceAvailable: true,
  },
  '3': {
    ...MOUNTAINS[2],
    sourceMountainCode: 'MNT-003',
    sourceOldMountainCode: null,
    serviceAvailable: false,
  },
};

function getMountainPage(url: URL) {
  const keyword = url.searchParams.get('keyword')?.trim() ?? '';
  const page = Number(url.searchParams.get('page') ?? 0);
  const size = Number(url.searchParams.get('size') ?? 10);
  const filtered = keyword
    ? MOUNTAINS.filter((mountain) => mountain.mountainName.includes(keyword))
    : MOUNTAINS;

  return {
    items: filtered.slice(page * size, (page + 1) * size),
    page,
    size,
    totalElements: filtered.length,
    totalPages: filtered.length === 0 ? 0 : Math.ceil(filtered.length / size),
  };
}

async function installMountainRoute(page: Page) {
  await page.route('**/api/mountains?*', async (route) => {
    await route.fulfill({ json: getMountainPage(new URL(route.request().url())) });
  });
  await page.route('**/api/mountains/*', async (route) => {
    const mountainId = new URL(route.request().url()).pathname.split('/').at(-1) ?? '';
    const detail = MOUNTAIN_DETAILS[mountainId as keyof typeof MOUNTAIN_DETAILS];

    await route.fulfill(
      detail
        ? { json: detail }
        : { status: 404, json: { code: 'MOUNTAIN_NOT_FOUND', message: '산을 찾을 수 없습니다.' } },
    );
  });
}

test('산 선택 화면은 API 목록과 지도 패널을 표시한다', async ({ page }) => {
  await installMountainRoute(page);
  await page.setViewportSize({ width: 440, height: 956 });
  await page.goto('/mountains');

  await expect(page.getByRole('heading', { name: '어느 산으로 갈까요?' })).toBeVisible();
  const panel = page.getByRole('complementary', { name: '산 선택 패널' });
  await expect(panel.getByRole('searchbox', { name: '산 이름 검색' })).toBeVisible();
  await expect(page.locator('.orda-map-layout__header').getByRole('searchbox')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'ORDA 산 탐색으로 이동' })).toBeVisible();
  await expect(page.getByText('산 목록 3')).toBeVisible();
  await expect(page.locator('.mountain-card')).toHaveCount(3);
  await expect(page.locator('.mountain-card').filter({ hasText: '관악산' })).toContainText(
    '서울특별시 관악구 · 629m',
  );
  await expect(page.getByText('서비스 대상 산')).toHaveCount(0);
  await expect(page.getByText('상세 정보 확인 가능')).toHaveCount(0);
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
  await installMountainRoute(page);
  await page.setViewportSize({ width: 440, height: 956 });

  const readNavigationMetrics = async (navigationName: string) => {
    const links = page.getByRole('navigation', { name: navigationName }).getByRole('link');
    await expect(links).toHaveCount(3);

    return links.evaluateAll((items) =>
      items.map((link) => {
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
  };

  await page.goto('/my-courses');
  const myCoursesMetrics = await readNavigationMetrics('내 코스 내비게이션');

  await page.goto('/mountains');
  const mountainMetrics = await readNavigationMetrics('산 선택 화면 내비게이션');

  expect(mountainMetrics).toEqual(myCoursesMetrics);
});

test('산 선택 레이아웃은 360·768·1024px에서 넘치지 않고 패널과 지도를 분리한다', async ({
  page,
}) => {
  await installMountainRoute(page);

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
      await expect(page.getByRole('navigation', { name: '주요 메뉴' })).toHaveCount(0);
      await expect(page.getByRole('link', { name: '내 코스', exact: true })).toBeVisible();
      await expect(page.getByRole('link', { name: '마이페이지로 이동' })).toBeVisible();
    }
  }
});

test('키워드 검색은 인증된 산 목록 API 요청을 사용한다', async ({ page }) => {
  const requests: Array<{ authorization?: string; url: URL }> = [];

  await page.route('**/api/mountains?*', async (route) => {
    requests.push({
      authorization: route.request().headers().authorization,
      url: new URL(route.request().url()),
    });
    await route.fulfill({ json: getMountainPage(new URL(route.request().url())) });
  });
  await page.setViewportSize({ width: 440, height: 956 });
  await page.goto('/mountains');

  await expect(page.locator('.mountain-card')).toHaveCount(3);
  expect(requests.at(-1)?.url.searchParams.get('page')).toBe('0');
  expect(requests.at(-1)?.url.searchParams.get('size')).toBe('10');
  expect(requests.at(-1)?.authorization).toBe('Bearer e2e-access-token');

  await page.getByRole('searchbox', { name: '산 이름 검색' }).fill('관악산');
  await expect(page.locator('.mountain-card')).toHaveCount(1);
  await expect(page.locator('.mountain-card')).toContainText('관악산');
  expect(requests.at(-1)?.url.searchParams.get('keyword')).toBe('관악산');

  await page.getByRole('searchbox', { name: '산 이름 검색' }).fill('없는 산 이름');
  await expect(page.getByText('검색 결과가 없어요.')).toBeVisible();
  await page.getByRole('button', { name: '검색 초기화' }).click();
  await expect(page.locator('.mountain-card')).toHaveCount(3);
});

test('산 선택 시 상세 조회 결과로 서비스 가능 여부를 처리한다', async ({ page }) => {
  await installMountainRoute(page);
  await page.goto('/mountains');

  const gwanaksanDetailRequest = page.waitForRequest((request) =>
    request.url().endsWith('/api/mountains/1'),
  );
  await page.locator('.mountain-card').filter({ hasText: '관악산' }).click();

  await gwanaksanDetailRequest;
  await expect(page.getByRole('region', { name: '선택한 산 상세' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '코스 탐색 설정' })).toBeEnabled();

  const cheonggyesanDetailRequest = page.waitForRequest((request) =>
    request.url().endsWith('/api/mountains/3'),
  );
  await page.locator('.mountain-card').filter({ hasText: '청계산' }).click();
  await cheonggyesanDetailRequest;
  await expect(page.getByRole('button', { name: '코스 탐색 설정' })).toBeDisabled();
});

test('산 상세 조회에서 산 미존재 오류를 안내한다', async ({ page }) => {
  await installMountainRoute(page);
  await page.route('**/api/mountains/1', async (route) => {
    await route.fulfill({
      status: 404,
      json: { code: 'MOUNTAIN_NOT_FOUND', message: '사용 가능한 산을 찾을 수 없습니다.' },
    });
  });
  await page.goto('/mountains');

  await page.locator('.mountain-card').filter({ hasText: '관악산' }).click();

  await expect(page.getByRole('alert')).toContainText('선택한 산 정보를 찾을 수 없어요.');
  await expect(page.getByRole('button', { name: '코스 탐색 설정' })).toBeDisabled();
});

test('산 목록은 이전·다음 페이지를 이동한다', async ({ page }) => {
  await page.route('**/api/mountains?*', async (route) => {
    const url = new URL(route.request().url());
    const pageNumber = Number(url.searchParams.get('page') ?? 0);
    const items = pageNumber === 0 ? MOUNTAINS.slice(0, 2) : MOUNTAINS.slice(2);

    await route.fulfill({
      json: {
        items,
        page: pageNumber,
        size: 2,
        totalElements: 3,
        totalPages: 2,
      },
    });
  });
  await page.goto('/mountains');

  const pagination = page.getByRole('navigation', { name: '산 목록 페이지' });
  await expect(pagination.getByText('1 / 2')).toBeVisible();
  await expect(pagination.getByRole('button', { name: '이전' })).toBeDisabled();
  await pagination.getByRole('button', { name: '다음' }).click();
  await expect(page.locator('.mountain-card')).toHaveCount(1);
  await expect(page.locator('.mountain-card')).toContainText('청계산');
  await expect(pagination.getByText('2 / 2')).toBeVisible();
  await expect(pagination.getByRole('button', { name: '다음' })).toBeDisabled();

  await pagination.getByRole('button', { name: '이전' }).click();
  await expect(page.locator('.mountain-card')).toHaveCount(2);
});

test('산 목록 로딩과 조회 실패 상태에서 안내와 재시도를 제공한다', async ({ page }) => {
  let shouldFail = true;
  let releaseLoading: (() => void) | undefined;
  const loading = new Promise<void>((resolve) => {
    releaseLoading = resolve;
  });

  await page.route('**/api/mountains?*', async (route) => {
    await loading;

    if (shouldFail) {
      await route.fulfill({ status: 500, json: { code: 'INTERNAL_SERVER_ERROR' } });
      return;
    }

    await route.fulfill({ json: getMountainPage(new URL(route.request().url())) });
  });
  await page.goto('/mountains');

  await expect(page.getByText('산 목록을 불러오는 중이에요.')).toBeVisible();
  releaseLoading?.();
  await expect(page.getByRole('alert')).toContainText('산 목록을 불러오지 못했어요.');

  shouldFail = false;
  await page.getByRole('button', { name: '다시 시도' }).click();
  await expect(page.locator('.mountain-card')).toHaveCount(3);
});

test('산 카드는 키보드 선택과 Escape·버튼 선택 취소를 지원한다', async ({ page }) => {
  await installMountainRoute(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/mountains');

  const gwanaksan = page.locator('.mountain-card').filter({ hasText: '관악산' });
  const bukhansan = page.locator('.mountain-card').filter({ hasText: '북한산' });
  const mapSurface = page.locator('.orda-map-layout__map-surface');

  await expect(gwanaksan).toHaveAttribute('aria-pressed', 'false');
  await bukhansan.focus();
  await page.keyboard.press('Enter');
  await expect(bukhansan).toHaveAttribute('aria-pressed', 'true');
  await expect(gwanaksan).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByText('선택한 산: 북한산')).toBeVisible();
  await expect.poll(() => mapSurface.getAttribute('data-map-center')).toBe('126.978000,37.658630');

  await page.keyboard.press('Escape');
  await expect(bukhansan).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByText('산을 선택하지 않았습니다.')).toBeVisible();

  await gwanaksan.scrollIntoViewIfNeeded();
  await gwanaksan.click();
  await page.getByRole('button', { name: '선택 취소' }).click();
  await expect(gwanaksan).toHaveAttribute('aria-pressed', 'false');
});

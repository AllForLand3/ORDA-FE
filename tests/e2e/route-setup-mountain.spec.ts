import type { Page } from '@playwright/test';

import { expect, test } from '../fixtures/authenticatedTest';

const places = 'origin=seoul-national-university-research-center&destination=gwanaksan-yeonjudae';
const conditions = `${places}&priorities=gentle-slope&facilities=shelter`;
const mountain = {
  mountainId: '42',
  mountainName: '북한산',
  sourceMountainCode: null,
  sourceOldMountainCode: null,
  serviceAvailable: true,
  addressLabel: '서울특별시 강북구',
  provinceName: '서울특별시',
  districtName: '강북구',
  elevationMeters: 836,
  geometry: { type: 'Point', coordinates: [126.978, 37.65863] },
};

async function expectSetupBlocked(page: Page) {
  for (const name of ['코스 설정 입력', '코스 설정 단계 이동']) {
    const controls = page.getByRole('group', { name, exact: true }).locator('button, input');
    expect(await controls.count()).toBeGreaterThan(0);
    for (const control of await controls.all()) await expect(control).toBeDisabled();
  }
}

test('잘못된 산 ID는 상세 API나 다른 API 경로를 호출하지 않는다', async ({ page }) => {
  test.setTimeout(60_000);
  const requests: string[] = [];
  await page.route(
    (url) => url.pathname.startsWith('/api/'),
    async (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path === '/api/auth/me') return route.fallback();
      requests.push(path);
      await route.fulfill({ status: 404, json: {} });
    },
  );

  for (const id of [
    '',
    '.',
    '..',
    '../auth/me',
    '/',
    '\\',
    '42/../..',
    '42?x=1',
    '42#fragment',
    '%2e%2e',
    '0',
    '-1',
    '1.5',
    '1e3',
    '+42',
    'abc',
    ' 42',
    '４２',
    '9223372036854775808',
    '999999999999999999999999',
  ]) {
    await page.goto(
      `/routes/setup?mountainId=${encodeURIComponent(id)}&step=conditions&${conditions}`,
    );
    await expect(page.getByRole('alert')).toContainText('산 ID가 올바르지 않아요.');
    await expectSetupBlocked(page);
    await expect(page.getByRole('button', { name: '맞춤 경로 탐색하기' })).toBeDisabled();
    expect(requests, `invalid ID: ${id}`).toEqual([]);
  }
});

test('상세 API 클라이언트를 직접 호출해도 잘못된 ID는 요청 전에 거부한다', async ({ page }) => {
  const requests: string[] = [];
  await page.route(
    (url) => url.pathname.startsWith('/api/'),
    async (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path === '/api/auth/me') return route.fallback();
      requests.push(path);
      await route.fulfill({ json: {} });
    },
  );
  await page.goto('/routes/setup?mountainId=bukhansan');
  const errors = await page.evaluate(async () => {
    const modulePath = '/src/features/course/api/mountains.ts';
    const api = await import(modulePath);
    const errors: string[] = [];
    for (const id of ['.', '..', '../auth/me', '42/extra', '0', '9223372036854775808']) {
      for (const request of [api.getMountain, api.getServiceArea]) {
        try {
          await request(id);
          errors.push('request accepted');
        } catch (error) {
          errors.push(error instanceof TypeError ? 'TypeError' : 'unexpected error');
        }
      }
    }
    return errors;
  });
  expect(errors).toEqual(Array(12).fill('TypeError'));
  expect(requests).toEqual([]);
});

test('Long 범위의 큰 ID와 선행 0이 있는 양의 정수 ID는 문자열 그대로 요청한다', async ({
  page,
}) => {
  const ids: string[] = [];
  await page.route('**/api/mountains/*', async (route) => {
    const id = new URL(route.request().url()).pathname.split('/').at(-1) ?? '';
    ids.push(id);
    await route.fulfill({ json: { ...mountain, mountainId: id } });
  });
  const validIds = ['9007199254740993', '9223372036854775807', '00042'];
  for (const id of validIds) {
    await page.goto(`/routes/setup?mountainId=${id}&step=conditions&${conditions}`);
    await expect(page.getByRole('button', { name: '맞춤 경로 탐색하기' })).toBeEnabled();
    await expect(page.locator('.orda-map-layout__map-surface')).toHaveAttribute(
      'data-map-center',
      '126.978000,37.658630',
    );
  }
  expect(ids).toEqual(validIds);
  await page.getByRole('button', { name: '맞춤 경로 탐색하기' }).click();
  await expect(page).toHaveURL(/\/routes\/results\?mountainId=00042&/);
});

for (const step of ['locations', 'difficulty', 'conditions']) {
  test(`API 로딩 중 ${step} 입력·이동을 막고 성공 후 다시 허용한다`, async ({ page }) => {
    let release = () => {};
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route('**/api/mountains/42', async (route) => {
      await pending;
      await route.fulfill({ json: mountain });
    });
    await page.goto(`/routes/setup?mountainId=42&step=${step}&${conditions}`);
    await expect(page.getByText('산 위치를 확인하는 중이에요.')).toBeVisible();
    await expectSetupBlocked(page);
    release();
    const forward = page.getByRole('button', {
      name: step === 'conditions' ? '맞춤 경로 탐색하기' : /다음/,
    });
    await expect(forward).toBeEnabled();
    await expect(
      page
        .getByRole('group', { name: '코스 설정 입력', exact: true })
        .locator('button, input')
        .first(),
    ).toBeEnabled();
    await forward.click();
    if (step === 'conditions') {
      await expect(page).toHaveURL(/\/routes\/results\?mountainId=42&/);
    } else {
      await expect(page).toHaveURL(
        new RegExp(`step=${step === 'locations' ? 'difficulty' : 'conditions'}`),
      );
    }
  });
}

for (const status of [404, 500]) {
  test(`산 상세 ${status} 오류에서 완성된 조건 URL로 진입해도 진행할 수 없다`, async ({ page }) => {
    await page.route('**/api/mountains/42', (route) =>
      route.fulfill({
        status,
        json: { status, code: status === 404 ? 'MOUNTAIN_NOT_FOUND' : 'INTERNAL_SERVER_ERROR' },
      }),
    );
    await page.goto(`/routes/setup?mountainId=42&step=conditions&${conditions}`);
    await expect(page.getByRole('alert')).toContainText('산 위치를 표시할 수 없어요.');
    await expectSetupBlocked(page);
  });
}

for (const geometry of [null, { type: 'Point', coordinates: [200, 37] }]) {
  test(`좌표가 ${geometry ? '잘못된' : '없는'} API 산은 조건 입력과 결과 이동을 막는다`, async ({
    page,
  }) => {
    await page.route('**/api/mountains/42', (route) =>
      route.fulfill({ json: { ...mountain, geometry } }),
    );
    await page.goto(`/routes/setup?mountainId=42&step=conditions&${conditions}`);
    await expect(page.getByRole('alert')).toContainText('산 위치를 표시할 수 없어요.');
    await expectSetupBlocked(page);
  });
}

test('서비스 불가 확인 전에는 진행할 수 없고 확인 후 산 선택으로 돌아간다', async ({ page }) => {
  let release = () => {};
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/api/mountains/42', async (route) => {
    await pending;
    await route.fulfill({ json: { ...mountain, serviceAvailable: false } });
  });
  await page.route('**/api/mountains?*', (route) =>
    route.fulfill({
      json: { items: [], page: 0, size: 10, totalElements: 0, totalPages: 0 },
    }),
  );
  await page.goto(`/routes/setup?mountainId=42&step=conditions&${conditions}`);
  await expectSetupBlocked(page);
  release();
  await expect(page).toHaveURL(/\/mountains$/);
});

test('성공 데이터가 캐시에 남아 있어도 재조회 오류가 나면 진행을 막는다', async ({ page }) => {
  let fail = false;
  await page.route('**/api/mountains/42', (route) =>
    route.fulfill(
      fail
        ? {
            status: 500,
            json: { status: 500, code: 'INTERNAL_SERVER_ERROR' },
          }
        : { json: mountain },
    ),
  );
  await page.goto(`/routes/setup?mountainId=42&step=conditions&${conditions}`);
  await expect(page.getByRole('button', { name: '맞춤 경로 탐색하기' })).toBeEnabled();
  fail = true;
  await page.evaluate(async () => {
    const modulePath = '/src/lib/queryClient.ts';
    const { queryClient } = await import(modulePath);
    await queryClient.refetchQueries({ queryKey: ['mountains', 'detail', '42'] });
  });
  await expect(page.getByRole('alert')).toContainText('산 위치를 표시할 수 없어요.');
  await expectSetupBlocked(page);
  await expect(page.locator('.orda-map-layout__map-surface')).not.toHaveAttribute(
    'data-map-ready',
    'true',
  );
});

test('Mock 산은 상세 API 없이 기존 조건 설정과 결과 이동을 유지한다', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/api/mountains')) requests.push(request.url());
  });
  await page.goto(`/routes/setup?mountainId=bukhansan&step=conditions&${conditions}`);
  await expect(page.getByRole('button', { name: /거리 우선/ })).toBeEnabled();
  await expect(page.getByRole('button', { name: '맞춤 경로 탐색하기' })).toBeEnabled();
  await page.getByRole('button', { name: '맞춤 경로 탐색하기' }).click();
  await expect(page).toHaveURL(/\/routes\/results\?mountainId=bukhansan&/);
  expect(requests).toEqual([]);
});

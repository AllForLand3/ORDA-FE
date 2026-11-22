import type { Page } from '@playwright/test';

// 스냅 API를 모킹한다. 예시 장소는 경도별로 서로 다른 노드, 그 외 좌표는 별도 노드로 연결한다.
export async function mockSnap(page: Page) {
  const nodeByLongitude: Record<string, string> = {
    '126.9518': '101',
    '126.96444': '102',
    '126.9523': '103',
  };
  await page.route(
    (url) => url.pathname === '/api/routes/snap',
    async (route) => {
      const url = new URL(route.request().url());
      const longitude = Number(url.searchParams.get('longitude'));
      const latitude = Number(url.searchParams.get('latitude'));
      await route.fulfill({
        status: 200,
        json: {
          mountainId: '2',
          nodeId: nodeByLongitude[String(longitude)] ?? '900',
          distanceM: 12.4,
          coordinates: [longitude + 0.0001, latitude + 0.0001],
        },
      });
    },
  );
}

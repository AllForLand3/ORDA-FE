import type { BrowserContext, Page } from '@playwright/test';

/** 기존 상세/분석 테스트는 주변 자료가 있는 산의 빈 결과로 API를 격리한다. */
export async function mockCourseNearby(target: BrowserContext | Page) {
  await target.route(/\/api\/courses\/[^/]+\/(spots|facilities)(?:\?.*)?$/, (route) => {
    const url = new URL(route.request().url());
    return route.fulfill({
      json: {
        courseId: decodeURIComponent(url.pathname.split('/')[3]),
        revNo: Number(url.searchParams.get('revNo')),
        radiusM: Number(url.searchParams.get('radiusM') ?? 200),
        dataAvailable: true,
        counts: {},
        items: [],
      },
    });
  });
  // 경로 탐색 결과 테스트는 후보 주변 자료가 없는 상태로 격리해 카드에 수치를 채우지 않는다.
  await target.route('**/api/routes/nearby', (route) => {
    const body = route.request().postDataJSON() as { mountainId: string; radiusM?: number };
    const empty = { dataAvailable: false, counts: {}, items: [] };
    return route.fulfill({
      json: {
        mountainId: body.mountainId,
        radiusM: body.radiusM ?? 200,
        spots: empty,
        facilities: empty,
      },
    });
  });
}

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
}

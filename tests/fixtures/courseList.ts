import type { BrowserContext, Page } from '@playwright/test';

export const courseListItems = [
  {
    courseId: '9007199254740993',
    mountainId: '2',
    mountainName: '관악산',
    courseName: '관악산 등산 코스',
    memo: '주말 아침 등산',
    createType: 'IMPORT',
    lengthM: 5800,
    estTimeMin: 160,
  },
  {
    courseId: '101',
    mountainId: '2',
    mountainName: '관악산',
    courseName: '메모 없는 코스',
    memo: null,
    createType: 'DRAW',
    lengthM: null,
    estTimeMin: null,
  },
];

export const courseListDetail = {
  courseId: courseListItems[0].courseId,
  mountainId: '2',
  courseName: courseListItems[0].courseName,
  memo: courseListItems[0].memo,
  createType: 'IMPORT',
  lengthM: 5800,
  revNo: 1,
  geometry: {
    type: 'LineString',
    coordinates: [
      [126.97, 37.47],
      [126.975, 37.48],
    ],
  },
};

export async function mockCourseList(target: BrowserContext | Page) {
  await target.route('**/api/courses', (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    return route.fulfill({ json: courseListItems });
  });
}

import { expect, test } from '../fixtures/authenticatedTest';

const course = {
  courseId: '6',
  mountainId: '1',
  courseName: '실제 조회 테스트 코스',
  memo: '서버에서 가져온 메모',
  createType: 'IMPORT',
  revNo: 3,
  geometry: {
    type: 'LineString',
    coordinates: [
      [126.96, 37.44],
      [126.97, 37.45],
    ],
  },
  lengthM: 1066.8,
};

test('인증된 상세 조회 결과를 표시하고 새로고침·탭·목록 조건을 유지한다', async ({ page }) => {
  await page.route('**/api/courses/6', async (route) => {
    expect(route.request().method()).toBe('GET');
    expect(route.request().headers().authorization).toBe('Bearer e2e-access-token');
    await route.fulfill({ json: course });
  });
  await page.goto('/my-courses/6?list=q%3Dtest');
  await expect(page.getByRole('heading', { name: course.courseName, exact: true })).toBeVisible();
  await expect(page.getByText(course.memo, { exact: true })).toBeVisible();
  await expect(page.getByText('1.07 km', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '편집', exact: true })).toBeDisabled();
  await page.getByRole('tab', { name: '지형 분석' }).click();
  await expect(page.getByRole('region', { name: '코스 고도 분석', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('tab', { name: '지형 분석' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.getByRole('link', { name: '내 코스 목록으로', exact: true }).click();
  await expect(page).toHaveURL(/\/my-courses\?q=test$/);
});

test('응답 대기 중 로딩을 표시하고 응답 후 상세를 표시한다', async ({ page }) => {
  let release = () => {};
  const ready = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/api/courses/6', async (route) => {
    await ready;
    await route.fulfill({ json: course });
  });
  await page.goto('/my-courses/6');
  try {
    await expect(page.getByText('코스 정보를 불러오고 있어요.', { exact: true })).toBeVisible();
  } finally {
    release();
  }
  await expect(page.getByRole('heading', { name: course.courseName, exact: true })).toBeVisible();
});

test('통신 실패는 자동 재시도하지 않고 사용자 재시도로 복구한다', async ({ page }) => {
  let requests = 0;
  await page.route('**/api/courses/6', async (route) => {
    requests += 1;
    if (requests === 1) {
      await route.abort('failed');
      return;
    }
    await route.fulfill({ json: course });
  });
  await page.goto('/my-courses/6');
  await expect(page.getByRole('alert')).toContainText('연결 상태를 확인');
  expect(requests).toBe(1);
  await page.getByRole('button', { name: '다시 시도', exact: true }).click();
  await expect(page.getByRole('heading', { name: course.courseName, exact: true })).toBeVisible();
  expect(requests).toBe(2);
});

test('없는 코스는 재시도 없이 접근 불가 안내를 표시한다', async ({ page }) => {
  await page.route('**/api/courses/6', async (route) => {
    await route.fulfill({
      status: 404,
      json: { status: 404, code: 'COURSE_NOT_FOUND', message: '코스를 찾을 수 없습니다.' },
    });
  });
  await page.goto('/my-courses/6');
  await expect(
    page.getByRole('heading', { name: '코스를 찾을 수 없어요', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: '다시 시도', exact: true })).toHaveCount(0);
});

test('예시 ID를 실제 상세 API에 전송하지 않는다', async ({ page }) => {
  const requests: string[] = [];
  await page.route('**/api/courses/**', async (route) => {
    requests.push(route.request().url());
    await route.abort();
  });
  await page.goto('/my-courses/example-ridge-1');
  await expect(
    page.getByRole('heading', { name: '코스 주소를 확인해주세요', exact: true }),
  ).toBeVisible();
  expect(requests).toEqual([]);
});

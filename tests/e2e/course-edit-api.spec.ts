import { expect, test } from '../fixtures/authenticatedTest';

const course = {
  courseId: '101',
  mountainId: '1',
  courseName: '원래 이름',
  memo: '원래 메모',
  createType: 'IMPORT',
  revNo: 1,
  lengthM: 180.4,
  geometry: {
    type: 'LineString',
    coordinates: [
      [126.97, 37.47],
      [126.975, 37.48],
    ],
  },
};

test.beforeEach(async ({ page }) => {
  await page.route('https://*.tile.openstreetmap.org/**', (route) => route.abort());
});

test('지도 조작은 수정 상태를 만들지 않고 이름·메모만 PATCH한다', async ({ page }) => {
  const patches: unknown[] = [];
  const value = {
    ...course,
    geometry: {
      type: 'LineString',
      coordinates: [
        [126.974, 37.475],
        [126.975, 37.475],
        [126.976, 37.475],
      ],
    },
  };
  await page.setViewportSize({ width: 1512, height: 900 });
  await page.route('**/api/courses/101', (route) => {
    if (route.request().method() === 'PATCH') {
      const body = route.request().postDataJSON();
      patches.push(body);
      return route.fulfill({ json: { ...value, ...body }, headers: { ETag: '"v2"' } });
    }
    return route.fulfill({ json: value, headers: { ETag: '"v1"' } });
  });
  await page.goto('/my-courses/101/edit');
  const map = page.locator('.orda-map-layout__map-surface');
  await expect(map).toHaveAttribute('data-map-center', '126.975000,37.475000');
  const box = await map.boundingBox();
  if (!box) throw new Error('지도가 표시되지 않았습니다.');
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.click(x + 70, y);
  await page.keyboard.down('Alt');
  await page.mouse.click(x, y);
  await page.keyboard.up('Alt');
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 30, y - 40, { steps: 8 });
  await page.mouse.up();
  const save = page.getByRole('button', { name: '저장', exact: true });
  await expect(save).toBeDisabled();
  await expect(page.getByRole('status')).toHaveText('저장된 내용입니다.');
  await expect(
    page.getByText('이름과 메모만 수정할 수 있습니다. 지도는 저장된 경로를 보여줍니다.'),
  ).toBeVisible();
  await page.getByRole('textbox', { name: '코스 이름', exact: true }).fill('수정한 이름');
  await page.getByRole('textbox', { name: '메모', exact: true }).fill('수정한 메모');
  await save.click();
  await expect(page.getByRole('status')).toHaveText('코스를 저장했습니다.');
  expect(patches).toEqual([{ courseName: '수정한 이름', memo: '수정한 메모' }]);
});

test('상세에서 편집하고 변경한 속성만 저장하며 다음 저장에 새 ETag를 쓴다', async ({ page }) => {
  let saved = course;
  let version = 1;
  const patches: unknown[] = [];
  await page.route('**/api/courses/101', async (route) => {
    if (route.request().method() === 'PATCH') {
      expect(route.request().headers()['if-match']).toBe(`"v${version}"`);
      expect(route.request().headers().authorization).toBe('Bearer e2e-access-token');
      const body = route.request().postDataJSON();
      patches.push(body);
      saved = { ...saved, ...body };
      version++;
    }
    await route.fulfill({ json: saved, headers: { ETag: `"v${version}"` } });
  });
  await page.goto('/my-courses/101?tab=terrain&list=q%3D주말');
  await page.getByRole('link', { name: '편집', exact: true }).click();
  await expect(page).toHaveURL(/101\/edit/);
  const name = page.getByRole('textbox', { name: '코스 이름', exact: true });
  const memo = page.getByRole('textbox', { name: '메모', exact: true });
  await expect(name).toHaveValue('원래 이름');
  await name.fill(' 수정 이름 ');
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('코스를 저장했습니다.');
  expect(patches).toEqual([{ courseName: '수정 이름' }]);
  await expect(name).toHaveValue('수정 이름');
  await memo.fill('');
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('코스를 저장했습니다.');
  expect(patches).toEqual([{ courseName: '수정 이름' }, { memo: null }]);
  await page.getByRole('link', { name: '취소', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('수정 이름');
  await expect(page.getByRole('tab', { name: '지형 분석' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('tab', { name: '코스 정보' }).click();
  await expect(page.getByText('등록된 메모가 없습니다.')).toBeVisible();
});

test('저장 실패 시 입력과 ETag를 유지하고 수동 재시도로 저장한다', async ({ page }) => {
  let attempts = 0;
  await page.route('**/api/courses/101', async (route) => {
    if (route.request().method() === 'PATCH') {
      attempts++;
      expect(route.request().headers()['if-match']).toBe('"v1"');
      if (attempts === 1)
        return route.fulfill({ status: 500, json: { code: 'INTERNAL_SERVER_ERROR' } });
      return route.fulfill({
        json: { ...course, courseName: '보존할 입력' },
        headers: { ETag: '"v2"' },
      });
    }
    await route.fulfill({ json: course, headers: { ETag: '"v1"' } });
  });
  await page.goto('/my-courses/101/edit');
  await page.getByRole('textbox', { name: '코스 이름', exact: true }).fill('보존할 입력');
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('입력은 유지했습니다.');
  await expect(page.getByRole('textbox', { name: '코스 이름', exact: true })).toHaveValue(
    '보존할 입력',
  );
  expect(attempts).toBe(1);
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('코스를 저장했습니다.');
  expect(attempts).toBe(2);
});

test('412 충돌 후 저장을 막고 확인 후에만 최신 원본으로 다시 편집한다', async ({ page }) => {
  let gets = 0;
  let patches = 0;
  await page.route('**/api/courses/101', async (route) => {
    if (route.request().method() === 'PATCH') {
      patches++;
      if (patches === 1)
        return route.fulfill({ status: 412, json: { code: 'COURSE_EDIT_CONFLICT' } });
      expect(route.request().headers()['if-match']).toBe('"v2"');
      return route.fulfill({
        json: { ...course, courseName: '새 원본에서 수정' },
        headers: { ETag: '"v3"' },
      });
    }
    gets++;
    return route.fulfill({
      json: gets === 1 ? course : { ...course, courseName: '다른 사람이 수정한 이름' },
      headers: { ETag: gets === 1 ? '"v1"' : '"v2"' },
    });
  });
  await page.goto('/my-courses/101/edit');
  const name = page.getByRole('textbox', { name: '코스 이름', exact: true });
  const save = page.getByRole('button', { name: '저장', exact: true });
  await name.fill('내 변경');
  await save.click();
  await expect(page.getByRole('alert')).toContainText('다른 곳에서 코스가 변경되었습니다.');
  await expect(name).toHaveValue('내 변경');
  await expect(save).toBeDisabled();
  expect(gets).toBe(1);
  await page.getByRole('button', { name: '최신 코스 불러오기' }).click();
  const dialog = page.getByRole('dialog', { name: '최신 코스를 불러올까요?' });
  await dialog.getByRole('button', { name: '계속 편집' }).click();
  await expect(name).toHaveValue('내 변경');
  expect(gets).toBe(1);
  await page.getByRole('button', { name: '최신 코스 불러오기' }).click();
  await dialog.getByRole('button', { name: '입력 버리고 불러오기' }).click();
  await expect(name).toHaveValue('다른 사람이 수정한 이름');
  await name.fill('새 원본에서 수정');
  await save.click();
  await expect(page.getByRole('status')).toHaveText('코스를 저장했습니다.');
  expect(patches).toBe(2);
});

test('이름·메모 길이를 code point로 검증하고 빈 이름을 전송하지 않는다', async ({ page }) => {
  let patches = 0;
  await page.route('**/api/courses/101', (route) => {
    if (route.request().method() === 'PATCH') {
      patches++;
      expect(route.request().postDataJSON()).toEqual({ courseName: '🌲'.repeat(100) });
    }
    return route.fulfill({
      json: patches ? { ...course, courseName: '🌲'.repeat(100) } : course,
      headers: { ETag: '"v1"' },
    });
  });
  await page.goto('/my-courses/101/edit');
  const name = page.getByRole('textbox', { name: '코스 이름', exact: true });
  const memo = page.getByRole('textbox', { name: '메모', exact: true });
  const save = page.getByRole('button', { name: '저장', exact: true });
  await name.fill(' ');
  await save.click();
  await expect(name).toHaveAttribute('aria-invalid', 'true');
  await name.fill('🌲'.repeat(101));
  await save.click();
  await expect(page.getByText('코스 이름은 100자 이내로 입력해주세요.')).toBeVisible();
  await name.fill('🌲'.repeat(100));
  await memo.fill('🌲'.repeat(1001));
  await save.click();
  await expect(memo).toHaveAttribute('aria-invalid', 'true');
  expect(patches).toBe(0);
  await memo.fill('원래 메모');
  await save.click();
  await expect(page.getByRole('status')).toHaveText('코스를 저장했습니다.');
  expect(patches).toBe(1);
});

test('취소·초기화·새로고침은 저장하지 않은 입력 유실을 확인한다', async ({ page }) => {
  await page.route('**/api/courses/101', (route) =>
    route.fulfill({ json: course, headers: { ETag: '"v1"' } }),
  );
  await page.goto('/my-courses/101/edit');
  const name = page.getByRole('textbox', { name: '코스 이름', exact: true });
  await name.fill('임시 이름');
  expect(
    await page.evaluate(() => {
      const event = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    }),
  ).toBe(true);
  await page.getByRole('link', { name: '취소', exact: true }).click();
  const leaving = page.getByRole('dialog', { name: '편집을 나갈까요?' });
  await leaving.getByRole('button', { name: '계속 편집' }).click();
  await expect(name).toHaveValue('임시 이름');
  await page.getByRole('button', { name: '초기화', exact: true }).click();
  await page
    .getByRole('dialog', { name: '입력을 초기화할까요?' })
    .getByRole('button', { name: '초기화', exact: true })
    .click();
  await expect(name).toHaveValue('원래 이름');
  await name.fill('버릴 변경');
  await page.getByRole('link', { name: '취소', exact: true }).click();
  await leaving.getByRole('button', { name: '변경 버리고 나가기' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('원래 이름');
});

test('저장 중 중복 요청을 막고 성공 응답에 ETag가 없어도 저장 성공을 유지한다', async ({
  page,
}) => {
  let complete: () => void = () => {};
  const pending = new Promise<void>((resolve) => {
    complete = resolve;
  });
  let patches = 0;
  await page.route('**/api/courses/101', async (route) => {
    if (route.request().method() === 'PATCH') {
      patches++;
      await pending;
      return route.fulfill({ json: { ...course, courseName: '저장됨' } });
    }
    return route.fulfill({ json: course, headers: { ETag: '"v1"' } });
  });
  await page.goto('/my-courses/101/edit');
  const name = page.getByRole('textbox', { name: '코스 이름', exact: true });
  await name.fill('저장됨');
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(name).toBeDisabled();
  await page
    .locator('#saved-course-edit-form')
    .evaluate((form) =>
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })),
    );
  complete();
  await expect(page.getByRole('status')).toHaveText('코스를 저장했습니다.');
  expect(patches).toBe(1);
  await name.fill('다음 수정');
  await expect(page.getByRole('button', { name: '저장', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: '최신 코스 불러오기' })).toBeVisible();
});

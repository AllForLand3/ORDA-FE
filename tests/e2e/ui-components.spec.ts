import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/fixtures/ui-components.html');
});

test('필드는 레이블과 오류 설명을 연결하고 체크박스와 비활성 버튼 상태를 제공한다', async ({
  page,
}) => {
  const email = page.getByRole('textbox', { name: '이메일' });
  await expect(email).toHaveAccessibleDescription('로그인에 사용할 이메일입니다.');

  const password = page.getByLabel('비밀번호');
  await expect(password).toHaveAttribute('aria-invalid', 'true');
  await expect(password).toHaveAccessibleDescription('비밀번호를 입력해주세요');

  const checkbox = page.getByRole('checkbox', { name: '서비스 이용약관에 동의합니다' });
  await checkbox.check();
  await expect(checkbox).toBeChecked();

  await expect(page.getByRole('button', { name: '비활성 저장' })).toBeDisabled();
});

test('검색창 필터 버튼은 키보드와 마우스로 사용할 수 있다', async ({ page }) => {
  const filterButton = page.getByRole('button', { name: '검색 조건 열기' });
  await filterButton.focus();
  await expect(filterButton).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByText('검색 조건 열림')).toBeVisible();
});

test('탭은 화살표 키로 선택과 패널을 바꾼다', async ({ page }) => {
  const comparisonTab = page.getByRole('tab', { name: '코스 비교' });
  const terrainTab = page.getByRole('tab', { name: '지형 분석' });
  await comparisonTab.focus();
  await page.keyboard.press('ArrowRight');

  await expect(terrainTab).toBeFocused();
  await expect(terrainTab).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tabpanel')).toHaveText('지형 분석 내용');
});

test('대화상자는 제목을 노출하고 Escape로 닫힌다', async ({ page }) => {
  await page.getByRole('button', { name: '코스 편집 열기' }).click();
  const dialog = page.getByRole('dialog', { name: '코스 편집' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAccessibleDescription('코스의 이름과 메모를 수정합니다.');

  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
});

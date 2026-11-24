import { expect as baseExpect, test as baseTest } from '@playwright/test';
import type { Page } from '@playwright/test';

import { expect, test } from '../fixtures/authenticatedTest';

function errorResponse(status: number, code: string) {
  return {
    status,
    code,
    message: '서버 메시지는 화면 분기에 쓰지 않는다',
    details: [],
    traceId: 't',
  };
}

async function mockChat(page: Page, handler: (index: number) => { status: number; json: object }) {
  const requests: unknown[] = [];
  await page.route('**/api/chat/messages', async (route) => {
    requests.push(route.request().postDataJSON());
    await route.fulfill(handler(requests.length - 1));
  });
  return requests;
}

async function openChat(page: Page) {
  await page.goto('/my-courses');
  await page.getByRole('button', { name: '이용 안내' }).click();
  const dialog = page.getByRole('dialog', { name: '이용 안내' });
  await expect(dialog).toBeVisible();
  return dialog;
}

test('질문을 보내면 지금까지의 대화를 함께 보내고 답변을 보여준다', async ({ page }) => {
  const requests = await mockChat(page, (index) => ({
    status: 200,
    json: { reply: index === 0 ? '산 선택 화면에서 시작해요.' : 'GeoJSON 파일만 받아요.' },
  }));
  const dialog = await openChat(page);
  const input = dialog.getByRole('textbox', { name: '질문' });

  await input.fill('경로는 어떻게 탐색해요?');
  await input.press('Enter');
  await expect(dialog.getByText('산 선택 화면에서 시작해요.')).toBeVisible();

  await input.fill('GPX도 돼요?');
  await dialog.getByRole('button', { name: '보내기' }).click();
  await expect(dialog.getByText('GeoJSON 파일만 받아요.')).toBeVisible();

  expect(requests).toEqual([
    { messages: [{ role: 'user', content: '경로는 어떻게 탐색해요?' }] },
    {
      messages: [
        { role: 'user', content: '경로는 어떻게 탐색해요?' },
        { role: 'assistant', content: '산 선택 화면에서 시작해요.' },
        { role: 'user', content: 'GPX도 돼요?' },
      ],
    },
  ]);

  await dialog.getByRole('button', { name: '새 대화' }).click();
  await expect(dialog.getByText('산 선택 화면에서 시작해요.')).toHaveCount(0);
});

test('요청이 많으면 안내하고 질문을 입력창에 되돌린다', async ({ page }) => {
  await mockChat(page, () => ({ status: 429, json: errorResponse(429, 'TOO_MANY_REQUESTS') }));
  const dialog = await openChat(page);
  const input = dialog.getByRole('textbox', { name: '질문' });

  await input.fill('내보내기 돼요?');
  await input.press('Enter');

  await expect(dialog.getByRole('alert')).toHaveText('질문이 많아요. 잠시 후 다시 시도해주세요.');
  await expect(input).toHaveValue('내보내기 돼요?');
  await expect(dialog.getByRole('list', { name: '대화' }).getByRole('listitem')).toHaveCount(1);
});

test('챗봇 설정이 없으면 사용할 수 없다고 안내한다', async ({ page }) => {
  await mockChat(page, () => ({ status: 503, json: errorResponse(503, 'CHAT_NOT_CONFIGURED') }));
  const dialog = await openChat(page);

  await dialog.getByRole('textbox', { name: '질문' }).fill('안녕');
  await dialog.getByRole('button', { name: '보내기' }).click();

  await expect(dialog.getByRole('alert')).toHaveText('지금은 이용 안내 챗봇을 사용할 수 없어요.');
});

baseTest('로그인하지 않으면 이용 안내 버튼을 보여주지 않는다', async ({ page }) => {
  await page.goto('/login');
  await baseExpect(page.getByRole('heading', { name: '로그인' })).toBeVisible();
  await baseExpect(page.getByRole('button', { name: '이용 안내' })).toHaveCount(0);
});

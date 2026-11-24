import { apiClient } from '@/lib/axios';

import type { ChatRequest, ChatResponse } from '../types/chat';

// POST /api/chat/messages. 서버는 대화를 저장하지 않으므로 지금까지의 대화를 함께 보낸다.
export async function sendChatMessage(request: ChatRequest) {
  const { data } = await apiClient.post<ChatResponse>('/chat/messages', request);
  return data;
}

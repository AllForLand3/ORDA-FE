export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

// 오래된 순서의 대화. 사용자와 챗봇이 번갈아 나오고 마지막은 사용자 메시지다.
export interface ChatRequest {
  messages: ChatMessage[];
}

export interface ChatResponse {
  reply: string;
}

// 서버 제한과 같게 맞춘다. 대화는 최대 20건, 메시지 하나는 1,000자까지 보낸다.
export const CHAT_MAX_MESSAGES = 20;
export const CHAT_MAX_MESSAGE_LENGTH = 1000;

import { useMutation } from '@tanstack/react-query';
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';

import { Button, Dialog, TextArea } from '@/components/ui';
import { getApiErrorCode, isNetworkError } from '@/lib/apiError';

import { sendChatMessage } from '../api/sendChatMessage';
import { CHAT_MAX_MESSAGE_LENGTH, CHAT_MAX_MESSAGES, type ChatMessage } from '../types/chat';
import '../chat.css';

const GREETING = 'ORDA 이용 방법을 물어보세요. 예: 경로는 어떻게 탐색해요?';

function getErrorMessage(error: unknown) {
  if (isNetworkError(error)) return '서버에 연결하지 못했어요. 잠시 후 다시 시도해주세요.';
  switch (getApiErrorCode(error)) {
    case 'TOO_MANY_REQUESTS':
      return '질문이 많아요. 잠시 후 다시 시도해주세요.';
    case 'CHAT_NOT_CONFIGURED':
      return '지금은 이용 안내 챗봇을 사용할 수 없어요.';
    case 'INVALID_REQUEST':
      return '대화가 너무 길어요. 새 대화를 시작해주세요.';
    default:
      return '답변을 받지 못했어요. 잠시 후 다시 시도해주세요.';
  }
}

/** 서비스 이용 안내 챗봇. 대화는 화면에만 두고 저장하지 않는다. 로그인 여부는 쓰는 쪽(App)에서 판단한다. */
export function ChatAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const listRef = useRef<HTMLOListElement>(null);
  const mutation = useMutation({ mutationFn: sendChatMessage, retry: false });

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages, mutation.isPending, mutation.isError]);

  const question = draft.trim();
  // 다음 질문과 답변을 합쳐도 서버 제한(20건)을 넘지 않을 때만 보낼 수 있다.
  const isFull = messages.length + 1 > CHAT_MAX_MESSAGES;
  const canSend = question.length > 0 && !mutation.isPending && !isFull;

  function send() {
    if (!canSend) return;
    const next: ChatMessage[] = [...messages, { role: 'user', content: question }];
    setMessages(next);
    setDraft('');
    mutation.mutate(
      { messages: next },
      {
        onSuccess: (data) =>
          setMessages((current) => [...current, { role: 'assistant', content: data.reply }]),
        // 실패한 질문은 대화에서 빼고 입력창에 되돌려 다시 보낼 수 있게 한다.
        onError: () => {
          setMessages((current) => current.slice(0, -1));
          setDraft(question);
        },
      },
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    send();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      send();
    }
  }

  function reset() {
    mutation.reset();
    setMessages([]);
    setDraft('');
  }

  return (
    <>
      <Button
        aria-haspopup="dialog"
        className="chat-assistant__launcher"
        onClick={() => setOpen(true)}
        size="sm"
      >
        이용 안내
      </Button>
      <Dialog
        closeLabel="이용 안내 닫기"
        description="ORDA 기능과 사용법을 안내해요. 대화는 저장되지 않아요."
        footer={
          <form className="chat-assistant__form" onSubmit={handleSubmit}>
            <TextArea
              disabled={mutation.isPending || isFull}
              hideLabel
              label="질문"
              maxLength={CHAT_MAX_MESSAGE_LENGTH}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="질문을 입력하세요"
              rows={2}
              value={draft}
            />
            <div className="chat-assistant__actions">
              <Button
                disabled={messages.length === 0 || mutation.isPending}
                onClick={reset}
                size="sm"
                type="button"
                variant="quiet"
              >
                새 대화
              </Button>
              <Button disabled={!canSend} size="sm" type="submit">
                보내기
              </Button>
            </div>
          </form>
        }
        onOpenChange={setOpen}
        open={open}
        title="이용 안내"
      >
        <ol aria-label="대화" aria-live="polite" className="chat-assistant__messages" ref={listRef}>
          <li className="chat-assistant__message chat-assistant__message--assistant">{GREETING}</li>
          {messages.map((message, index) => (
            <li
              className={`chat-assistant__message chat-assistant__message--${message.role}`}
              key={index}
            >
              <span className="chat-assistant__sr-only">
                {message.role === 'user' ? '나: ' : '챗봇: '}
              </span>
              {message.content}
            </li>
          ))}
        </ol>
        {mutation.isPending ? (
          <p className="chat-assistant__status" role="status">
            답변을 준비하고 있어요.
          </p>
        ) : null}
        {mutation.isError ? (
          <p className="chat-assistant__status chat-assistant__status--error" role="alert">
            {getErrorMessage(mutation.error)}
          </p>
        ) : null}
        {isFull ? (
          <p className="chat-assistant__status" role="status">
            대화가 길어져 더 보낼 수 없어요. 새 대화를 시작해주세요.
          </p>
        ) : null}
      </Dialog>
    </>
  );
}

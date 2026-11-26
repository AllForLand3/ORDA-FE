import { useMutation } from '@tanstack/react-query';
import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';

import { Button, IconButton, TextArea } from '@/components/ui';
import { getApiErrorCode, isNetworkError } from '@/lib/apiError';

import { sendChatMessage } from '../api/sendChatMessage';
import { CHAT_MAX_MESSAGE_LENGTH, CHAT_MAX_MESSAGES, type ChatMessage } from '../types/chat';
import '../chat.css';

function ChatBubbleIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="26" viewBox="0 0 24 24" width="26">
      <path
        d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.2 3.6A.5.5 0 0 1 5 19.2V16a2.5 2.5 0 0 1-1-2V5.5Z"
        fill="currentColor"
      />
      <circle cx="8.5" cy="9.5" fill="var(--color-primary-default)" r="1.2" />
      <circle cx="12" cy="9.5" fill="var(--color-primary-default)" r="1.2" />
      <circle cx="15.5" cy="9.5" fill="var(--color-primary-default)" r="1.2" />
    </svg>
  );
}

function CloseIcon({ size = 22 }: { size?: number }) {
  return (
    <svg aria-hidden="true" fill="none" height={size} viewBox="0 0 24 24" width={size}>
      <path
        d="M6 6l12 12M18 6 6 18"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2.2"
      />
    </svg>
  );
}

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
  const panelRef = useRef<HTMLElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const panelId = useId();
  const mutation = useMutation({ mutationFn: sendChatMessage, retry: false });

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages, mutation.isPending, mutation.isError, open]);

  // 창을 열면 바로 질문을 쓸 수 있게 입력창으로 초점을 옮긴다.
  useEffect(() => {
    if (open) panelRef.current?.querySelector('textarea')?.focus();
  }, [open]);

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

  function close() {
    setOpen(false);
    launcherRef.current?.focus();
  }

  return (
    <div className={`chat-assistant${open ? ' chat-assistant--open' : ''}`}>
      {open ? (
        // 화면을 막지 않는 창이라 지도와 다른 기능을 그대로 쓸 수 있다. Esc로 닫는다.
        <section
          aria-describedby={descriptionId}
          aria-labelledby={titleId}
          className="chat-assistant__panel"
          id={panelId}
          onKeyDown={(event) => {
            if (event.key === 'Escape') close();
          }}
          ref={panelRef}
          role="dialog"
        >
          <header className="chat-assistant__header">
            <div>
              <h2 className="chat-assistant__title" id={titleId}>
                이용 안내
              </h2>
              <p className="chat-assistant__description" id={descriptionId}>
                ORDA 기능과 사용법을 안내해요. 대화는 저장되지 않아요.
              </p>
            </div>
            <IconButton
              aria-label="이용 안내 닫기"
              className="chat-assistant__close"
              onClick={close}
              size="sm"
            >
              <CloseIcon size={18} />
            </IconButton>
          </header>
          <ol
            aria-label="대화"
            aria-live="polite"
            className="chat-assistant__messages"
            ref={listRef}
          >
            <li className="chat-assistant__message chat-assistant__message--assistant">
              {GREETING}
            </li>
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
            {mutation.isPending ? (
              <li
                aria-label="답변을 준비하고 있어요."
                className="chat-assistant__message chat-assistant__message--assistant chat-assistant__typing"
              >
                <span />
                <span />
                <span />
              </li>
            ) : null}
          </ol>
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
        </section>
      ) : null}
      <button
        aria-controls={open ? panelId : undefined}
        aria-expanded={open}
        aria-label="이용 안내"
        className="chat-assistant__launcher"
        onClick={() => (open ? close() : setOpen(true))}
        ref={launcherRef}
        type="button"
      >
        {open ? <CloseIcon /> : <ChatBubbleIcon />}
      </button>
    </div>
  );
}

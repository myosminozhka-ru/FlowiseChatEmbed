import { observersConfigType } from './components/Bot';
import { BubbleTheme } from './features/bubble/types';

/* eslint-disable solid/reactivity */
type BotProps = {
  chatflowid: string; // Обязательный параметр
  apiHost: string; // Обязательный параметр
  authApiUrl: string; // Обязательный параметр - URL для auth API
  apiKey?: string;
  onRequest?: (request: RequestInit) => Promise<void>;
  chatflowConfig?: Record<string, unknown>;
  observersConfig?: observersConfigType;
  theme?: BubbleTheme;
};

let elementUsed: Element | undefined;

const createOnRequestWithApiKey = (apiKey?: string, customOnRequest?: (request: RequestInit) => Promise<void>) => {
  if (!apiKey && !customOnRequest) return undefined;

  return async (request: RequestInit) => {
    // Добавляем API ключ если указан
    if (apiKey) {
      if (!request.headers) {
        request.headers = {};
      }
      const headers = request.headers as Record<string, string>;
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    // Вызываем кастомный onRequest если есть
    if (customOnRequest) {
      await customOnRequest(request);
    }
  };
};

export const initFull = (props: BotProps & { id?: string }) => {
  // Проверяем обязательные параметры
  if (!props.chatflowid) {
    console.error('❌ [Chatbot.initFull] Параметр chatflowid обязателен! Укажите его при инициализации.');
    throw new Error('chatflowid обязателен для инициализации чатбота');
  }

  if (!props.apiHost) {
    console.error('❌ [Chatbot.initFull] Параметр apiHost обязателен! Укажите его при инициализации.');
    throw new Error('apiHost обязателен для инициализации чатбота');
  }

  if (!props.authApiUrl) {
    console.error('❌ [Chatbot.initFull] Параметр authApiUrl обязателен! Укажите его при инициализации.');
    throw new Error('authApiUrl обязателен для инициализации чатбота');
  }

  destroy();
  const { apiKey, authApiUrl, onRequest, ...restProps } = props;
  const finalOnRequest = createOnRequestWithApiKey(apiKey, onRequest);

  // Сохраняем authApiUrl в window для использования в запросах
  if (authApiUrl && typeof window !== 'undefined') {
    (window as any).__AUTH_API_URL__ = authApiUrl;
  }

  let fullElement = props.id ? document.getElementById(props.id) : document.querySelector('osmi-ai-fullchatbot');
  if (!fullElement) {
    fullElement = document.createElement('osmi-ai-fullchatbot');
    Object.assign(fullElement, { ...restProps, onRequest: finalOnRequest });
    document.body.appendChild(fullElement);
  } else {
    Object.assign(fullElement, { ...restProps, onRequest: finalOnRequest });
  }
  elementUsed = fullElement;
};

export const init = (props: BotProps) => {
  // Проверяем обязательные параметры
  if (!props.chatflowid) {
    console.error('❌ [Chatbot.init] Параметр chatflowid обязателен! Укажите его при инициализации.');
    throw new Error('chatflowid обязателен для инициализации чатбота');
  }

  if (!props.apiHost) {
    console.error('❌ [Chatbot.init] Параметр apiHost обязателен! Укажите его при инициализации.');
    throw new Error('apiHost обязателен для инициализации чатбота');
  }

  if (!props.authApiUrl) {
    console.error('❌ [Chatbot.init] Параметр authApiUrl обязателен! Укажите его при инициализации.');
    throw new Error('authApiUrl обязателен для инициализации чатбота');
  }

  destroy();
  const { apiKey, authApiUrl, onRequest, ...restProps } = props;
  const finalOnRequest = createOnRequestWithApiKey(apiKey, onRequest);

  // Сохраняем authApiUrl в window для использования в запросах
  if (authApiUrl && typeof window !== 'undefined') {
    (window as any).__AUTH_API_URL__ = authApiUrl;
  }

  const element = document.createElement('osmi-ai-chatbot');
  Object.assign(element, { ...restProps, onRequest: finalOnRequest });
  document.body.appendChild(element);
  elementUsed = element;
};

export const destroy = () => {
  elementUsed?.remove();
};

type Chatbot = {
  initFull: typeof initFull;
  init: typeof init;
  destroy: typeof destroy;
};

declare const window:
  | {
      Chatbot: Chatbot | undefined;
    }
  | undefined;

export const parseChatbot = () => ({
  initFull,
  init,
  destroy,
});

export const injectChatbotInWindow = (bot: Chatbot) => {
  if (typeof window === 'undefined') return;
  window.Chatbot = { ...bot };
};

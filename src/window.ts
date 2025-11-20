import { observersConfigType } from './components/Bot';
import { BubbleTheme } from './features/bubble/types';

/* eslint-disable solid/reactivity */
type BotProps = {
  chatflowid: string;
  apiHost?: string;
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
  destroy();
  const { apiKey, onRequest, ...restProps } = props;
  const finalOnRequest = createOnRequestWithApiKey(apiKey, onRequest);

  let fullElement = props.id ? document.getElementById(props.id) : document.querySelector('start-ai-fullchatbot');
  if (!fullElement) {
    fullElement = document.createElement('start-ai-fullchatbot');
    Object.assign(fullElement, { ...restProps, onRequest: finalOnRequest });
    document.body.appendChild(fullElement);
  } else {
    Object.assign(fullElement, { ...restProps, onRequest: finalOnRequest });
  }
  elementUsed = fullElement;
};

export const init = (props: BotProps) => {
  destroy();
  const { apiKey, onRequest, ...restProps } = props;
  const finalOnRequest = createOnRequestWithApiKey(apiKey, onRequest);

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

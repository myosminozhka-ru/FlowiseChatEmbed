import { FileUpload, IAction } from '@/components/Bot';
import { sendRequest } from '@/utils/index';

export type IncomingInput = {
  question?: string;
  form?: Record<string, unknown>;
  uploads?: FileUpload[];
  overrideConfig?: Record<string, unknown>;
  socketIOClientId?: string;
  chatId?: string;
  fileName?: string; // Only for assistant
  leadEmail?: string;
  action?: IAction;
  humanInput?: Record<string, unknown>;
};

type BaseRequest = {
  apiHost?: string;
  onRequest?: (request: RequestInit) => Promise<void>;
};

export type MessageRequest = BaseRequest & {
  chatflowid?: string;
  body?: IncomingInput;
};

export type FeedbackRatingType = 'THUMBS_UP' | 'THUMBS_DOWN';

export type FeedbackInput = {
  chatId: string;
  messageId: string;
  rating: FeedbackRatingType;
  content?: string;
  fio?: string;
  email?: string;
};

export type CreateFeedbackRequest = BaseRequest & {
  chatflowid?: string;
  body?: FeedbackInput;
};

export type UpdateFeedbackRequest = BaseRequest & {
  id: string;
  body?: Partial<FeedbackInput>;
};

export type UpsertRequest = BaseRequest & {
  chatflowid: string;
  apiHost?: string;
  formData: FormData;
};

export type LeadCaptureInput = {
  chatflowid: string;
  chatId: string;
  name?: string;
  email?: string;
  phone?: string;
};

export type LeadCaptureRequest = BaseRequest & {
  body: Partial<LeadCaptureInput>;
};

export const sendFeedbackQuery = ({ chatflowid, apiHost = 'http://localhost:3000', body, onRequest }: CreateFeedbackRequest) =>
  sendRequest({
    method: 'POST',
    url: `${apiHost}/api/v1/feedback/${chatflowid}`,
    body,
    onRequest: onRequest,
  });

export const updateFeedbackQuery = ({ id, apiHost = 'http://localhost:3000', body, onRequest }: UpdateFeedbackRequest) =>
  sendRequest({
    method: 'PUT',
    url: `${apiHost}/api/v1/feedback/${id}`,
    body,
    onRequest: onRequest,
  });

export const sendMessageQuery = ({ chatflowid, apiHost = 'http://localhost:3000', body, onRequest }: MessageRequest) =>
  sendRequest<any>({
    method: 'POST',
    url: `${apiHost}/api/v1/prediction/${chatflowid}`,
    body,
    onRequest: onRequest,
  });

export const createAttachmentWithFormData = ({ chatflowid, apiHost = 'http://localhost:3000', formData, onRequest }: UpsertRequest) =>
  sendRequest({
    method: 'POST',
    url: `${apiHost}/api/v1/attachments/${chatflowid}/${formData.get('chatId')}`,
    formData,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onRequest: onRequest,
  });

export const upsertVectorStoreWithFormData = ({ chatflowid, apiHost = 'http://localhost:3000', formData, onRequest }: UpsertRequest) =>
  sendRequest({
    method: 'POST',
    url: `${apiHost}/api/v1/vector/upsert/${chatflowid}`,
    formData,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onRequest: onRequest,
  });

export const getChatbotConfig = ({ chatflowid, apiHost = 'http://localhost:3000', onRequest }: MessageRequest) =>
  sendRequest<any>({
    method: 'GET',
    url: `${apiHost}/api/v1/public-chatbotConfig/${chatflowid}`,
    onRequest: onRequest,
  });

export const isStreamAvailableQuery = ({ chatflowid, apiHost = 'http://localhost:3000', onRequest }: MessageRequest) =>
  sendRequest<any>({
    method: 'GET',
    url: `${apiHost}/api/v1/chatflows-streaming/${chatflowid}`,
    onRequest: onRequest,
  });

export const sendFileDownloadQuery = ({ apiHost = 'http://localhost:3000', body, onRequest }: MessageRequest) =>
  sendRequest<any>({
    method: 'POST',
    url: `${apiHost}/api/v1/openai-assistants-file/download`,
    body,
    type: 'blob',
    onRequest: onRequest,
  });

export const addLeadQuery = ({ apiHost = 'http://localhost:3000', body, onRequest }: LeadCaptureRequest) =>
  sendRequest<any>({
    method: 'POST',
    url: `${apiHost}/api/v1/leads/`,
    body,
    onRequest: onRequest,
  });

// URL для auth API, можно переопределить через window.__AUTH_API_URL__
const AUTH_API_URL =
  typeof window !== 'undefined' && (window as any).__AUTH_API_URL__ ? (window as any).__AUTH_API_URL__ : 'https://uat.sk.ru/auth/user_info/';

export type TransferToAutoFAQRequest = BaseRequest & {
  chatflowid: string;
  body: {
    chatId: string;
    userMessage?: string;
    fio?: string;
    email?: string;
  };
};

export const transferChatHistoryToAutoFAQ = ({ chatflowid, apiHost = 'http://localhost:3000', body, onRequest }: TransferToAutoFAQRequest) =>
  sendRequest<any>({
    method: 'POST',
    url: `${apiHost}/api/v1/autofaq/${chatflowid}/transfer`,
    body,
    onRequest: onRequest,
  });

export type AuthRequest = BaseRequest & {
  token: string;
  onRequest?: (request: RequestInit) => Promise<void>;
};

export type AuthResponse = {
  fio?: string; // ФИО пользователя
  id?: string; // ID пользователя из ответа
  user_id?: string; // Альтернативное имя для id
  email?: string; // Email пользователя
  lower_email?: string; // Email в нижнем регистре
  telligent_id?: number; // ID пользователя из Telligent
  sub?: string; // Subject (идентификатор пользователя)
  username?: string; // Имя пользователя
  avatar?: string; // URL аватара
  groups?: string[]; // Группы пользователя
  [key: string]: unknown;
};

/**
 * Запрос для получения ФИО пользователя по токену sk_auth
 * @param token - Токен sk_auth из cookies
 * @param onRequest - Callback для модификации запроса
 * @returns Данные пользователя (fio и другие данные)
 */
export const authQuery = async ({ token, onRequest }: AuthRequest): Promise<{ data?: AuthResponse; error?: Error }> => {
  try {
    const url = `${AUTH_API_URL}?sk_auth=${encodeURIComponent(token)}`;
    console.log('🔐 [Auth] Запрос данных пользователя:', url.replace(token, '***'));
    return await sendRequest<AuthResponse>({
      method: 'GET',
      url,
      onRequest: onRequest,
    });
  } catch (e) {
    console.error('❌ [Auth] Ошибка запроса:', e);
    return { error: e as Error };
  }
};

export type GetChatMessagesRequest = BaseRequest & {
  chatflowid: string;
  chatId: string;
  lastMessageId?: string; // Для polling новых сообщений
};

/**
 * Получение сообщений чата
 * Если передан lastMessageId, возвращаются только новые сообщения после этого ID
 */
export const getChatMessagesQuery = ({ chatflowid, apiHost = 'http://localhost:3000', chatId, lastMessageId, onRequest }: GetChatMessagesRequest) =>
  sendRequest<any>({
    method: 'GET',
    url: `${apiHost}/api/v1/internal-chatmessage/${chatflowid}${
      lastMessageId ? `?chatId=${chatId}&lastMessageId=${lastMessageId}` : `?chatId=${chatId}`
    }`,
    onRequest: onRequest,
  });

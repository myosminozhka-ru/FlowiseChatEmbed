import { sendRequest } from '@/utils/index';

// Типы для AutoFAQ API
export type AutoFAQConfig = {
  apiBaseUrl: string;
  serviceId: string;
  channelId: string;
  apiToken: string;
  webhookUrl?: string;
};

export type AutoFAQMessage = {
  text: string;
  dialogId?: string;
  clientId?: string;
  metadata?: Record<string, unknown>;
};

export type AutoFAQDialogMetadata = {
  clientId?: string;
  channel?: string;
  segmentationAttributes?: Record<string, unknown>;
  additionalParams?: Record<string, unknown>;
};

export type AutoFAQWebhookEvent = {
  eventType: 'dialog.created' | 'dialog.closed' | 'dialog.transferred' | 'operator.changed';
  dialogId: string;
  timestamp: string;
  data?: Record<string, unknown>;
};

type BaseAutoFAQRequest = {
  config: AutoFAQConfig;
  onRequest?: (request: RequestInit) => Promise<void>;
};

/**
 * Получает прокси-URL для AutoFAQ API запросов
 * Использует прокси сервера для обхода CORS
 */
const getProxyUrl = (targetUrl: string): string => {
  // Если мы в браузере, используем прокси через сервер
  if (typeof window !== 'undefined') {
    // В dev режиме Express сервер обычно работает на порту 3001
    // В production используем текущий origin
    const isDev = window.location.hostname === 'localhost' && window.location.port === '5678';
    const proxyBaseUrl = isDev ? 'http://localhost:3001' : window.location.origin;
    const encodedTargetUrl = encodeURIComponent(targetUrl);
    return `${proxyBaseUrl}/api/v1/autofaq-proxy?targetUrl=${encodedTargetUrl}`;
  }
  // Если на сервере, используем прямой URL
  return targetUrl;
};

/**
 * Отправка сообщения (вопроса) в AutoFAQ
 * POST /api/ext/v2/services/{serviceId}/{channelId}/questionsAsync
 */
export const sendQuestionToAutoFAQ = async ({ config, message, onRequest }: BaseAutoFAQRequest & { message: AutoFAQMessage }) => {
  const targetUrl = `${config.apiBaseUrl}/api/ext/v2/services/${config.serviceId}/${config.channelId}/questionsAsync`;
  const url = getProxyUrl(targetUrl);

  const body = {
    text: message.text,
    dialogId: message.dialogId,
    clientId: message.clientId,
    metadata: message.metadata || {},
  };

  // Формируем заголовки: добавляем Authorization только если токен есть
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (config.apiToken) {
    headers.Authorization = `Bearer ${config.apiToken}`;
  }

  // Логируем запрос для отладки
  console.log('📤 [AutoFAQ API] Отправка запроса:', {
    method: 'POST',
    url,
    targetUrl,
    headers: {
      ...headers,
      Authorization: headers.Authorization ? 'Bearer ***' : '(отсутствует)',
    },
    body: {
      ...body,
      text: body.text.substring(0, 100) + (body.text.length > 100 ? '...' : ''),
    },
  });

  const result = await sendRequest({
    method: 'POST',
    url,
    body,
    headers,
    onRequest,
  });

  // Логируем ответ для отладки
  console.log('📥 [AutoFAQ API] Получен ответ:', {
    hasData: !!result.data,
    hasError: !!result.error,
    data: result.data,
    error: result.error,
    status: result.data ? 'success' : 'error',
  });

  return result;
};

/**
 * Установка webhook для получения событий от AutoFAQ
 * PUT /api/ext/v2/services/{serviceId}/{channelId}/webhook
 */
export const setAutoFAQWebhook = async ({ config, webhookUrl, onRequest }: BaseAutoFAQRequest & { webhookUrl: string }) => {
  const targetUrl = `${config.apiBaseUrl}/api/ext/v2/services/${config.serviceId}/${config.channelId}/webhook`;
  const url = getProxyUrl(targetUrl);

  const body = {
    url: webhookUrl,
  };

  return sendRequest({
    method: 'PUT',
    url,
    body,
    headers: {
      Authorization: `Bearer ${config.apiToken}`,
      'Content-Type': 'application/json',
    },
    onRequest,
  });
};

/**
 * Получение информации о диалоге
 * GET /api/ext/v2/dialogs/{dialogId}
 */
export const getAutoFAQDialog = async ({ config, dialogId, onRequest }: BaseAutoFAQRequest & { dialogId: string }) => {
  const targetUrl = `${config.apiBaseUrl}/api/ext/v2/dialogs/${dialogId}`;
  const url = getProxyUrl(targetUrl);

  return sendRequest({
    method: 'GET',
    url,
    headers: {
      Authorization: `Bearer ${config.apiToken}`,
    },
    onRequest,
  });
};

/**
 * Отправка сообщения в существующий диалог
 * POST /api/ext/v2/dialogs/{dialogId}/messages
 */
export const sendMessageToAutoFAQDialog = async ({
  config,
  dialogId,
  message,
  onRequest,
}: BaseAutoFAQRequest & { dialogId: string; message: AutoFAQMessage }) => {
  const targetUrl = `${config.apiBaseUrl}/api/ext/v2/dialogs/${dialogId}/messages`;
  const url = getProxyUrl(targetUrl);

  const body = {
    text: message.text,
    clientId: message.clientId,
    metadata: message.metadata || {},
  };

  return sendRequest({
    method: 'POST',
    url,
    body,
    headers: {
      Authorization: `Bearer ${config.apiToken}`,
      'Content-Type': 'application/json',
    },
    onRequest,
  });
};

/**
 * Переключение диалога на оператора
 * Создает новый диалог или использует существующий и переключает на оператора
 */
export const transferToOperator = async ({
  config,
  chatflowid,
  chatId,
  message,
  metadata,
  onRequest,
}: BaseAutoFAQRequest & {
  chatflowid: string;
  chatId: string;
  message: string;
  metadata?: AutoFAQDialogMetadata;
}) => {
  console.log('🔵 [transferToOperator] Функция вызвана');
  console.log('🔵 [transferToOperator] Параметры:', { chatflowid, chatId, messageLength: message.length });

  // Генерируем clientId на основе chatflowid и chatId
  const clientId = `${chatflowid}_${chatId}`;

  // Формируем метаданные для AutoFAQ
  const autofaqMetadata: Record<string, unknown> = {
    chatflowid,
    chatId,
    ...(metadata?.segmentationAttributes || {}),
    ...(metadata?.additionalParams || {}),
  };

  console.log('🔵 [transferToOperator] Вызываем sendQuestionToAutoFAQ');

  // Отправляем сообщение в AutoFAQ, которое автоматически создаст диалог и переключит на оператора
  const result = await sendQuestionToAutoFAQ({
    config,
    message: {
      text: message,
      clientId,
      metadata: autofaqMetadata,
    },
    onRequest,
  });

  console.log('🔵 [transferToOperator] Результат от sendQuestionToAutoFAQ:', { hasData: !!result.data, hasError: !!result.error });

  return result;
};

/**
 * Инициализация webhook при старте приложения
 * Вызывайте эту функцию при инициализации бота, если webhookUrl указан
 */
export const initializeAutoFAQWebhook = async ({ config, onRequest }: BaseAutoFAQRequest) => {
  if (!config.webhookUrl) {
    console.warn('Webhook URL is not configured');
    return;
  }

  try {
    const result = await setAutoFAQWebhook({
      config,
      webhookUrl: config.webhookUrl,
      onRequest,
    });

    if (result.data) {
      console.log('AutoFAQ webhook initialized successfully');
    } else if (result.error) {
      console.error('Error initializing AutoFAQ webhook:', result.error);
    }
  } catch (error) {
    console.error('Error in initializeAutoFAQWebhook:', error);
  }
};

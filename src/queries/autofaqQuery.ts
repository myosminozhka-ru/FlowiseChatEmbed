import { sendRequest } from '@/utils/index';

// Типы для AutoFAQ API
export type AutoFAQConfig = {
  apiBaseUrl: string;
  serviceId: string;
  channelId: string;
  apiToken: string; // Basic токен для логина (учетные данные)
  jwtToken?: string; // JWT токен, полученный через /login (кэшируется)
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
 * Авторизация в AutoFAQ API через /login endpoint
 * Возвращает JWT токен для использования в последующих запросах
 * GET /api/ext/v2/login
 * 
 * Использует Basic токен (apiToken) для получения JWT токена
 */
export const loginToAutoFAQ = async ({ config, onRequest }: BaseAutoFAQRequest): Promise<{ data?: string; error?: Error }> => {
  const targetUrl = `${config.apiBaseUrl}/api/ext/v2/login`;
  const url = getProxyUrl(targetUrl);

  const headers: Record<string, string> = {
    'accept': 'text/plain',
  };

  if (config.apiToken) {
    headers.Authorization = `Basic ${config.apiToken}`;
  }

  console.log('🔵 [AutoFAQ Login] Попытка авторизации:', {
    url,
    targetUrl,
    hasToken: !!config.apiToken,
  });

  const result = await sendRequest<string>({
    method: 'GET',
    url,
    headers,
    onRequest,
  });

  if (result.data) {
    console.log('✅ [AutoFAQ Login] Авторизация успешна, получен JWT токен');
    // JWT токен возвращается как строка (text/plain)
    return { data: result.data };
  } else if (result.error) {
    console.error('❌ [AutoFAQ Login] Ошибка авторизации:', result.error);
    return { error: result.error };
  }

  return result;
};

/**
 * Получает URL для AutoFAQ API запросов
 * В dev режиме использует прокси сервера для обхода CORS
 * В production использует прямой URL
 */
const getProxyUrl = (targetUrl: string): string => {
  // Если мы в браузере
  if (typeof window !== 'undefined') {
    // В dev режиме используем прокси (обход CORS на localhost)
    const isDev = window.location.hostname === 'localhost' && window.location.port === '5678';
    if (isDev) {
      const proxyBaseUrl = 'http://localhost:3001';
      const encodedTargetUrl = encodeURIComponent(targetUrl);
      return `${proxyBaseUrl}/api/v1/autofaq-proxy?targetUrl=${encodedTargetUrl}`;
    }
    // В production используем прямой URL (CORS должен быть настроен на сервере AutoFAQ)
    return targetUrl;
  }
  // Если на сервере, используем прямой URL
  return targetUrl;
};

/**
 * Получает JWT токен, если его еще нет (выполняет логин)
 */
const ensureJWTToken = async (config: AutoFAQConfig, onRequest?: (request: RequestInit) => Promise<void>): Promise<string | null> => {
  // Если JWT токен уже есть, используем его
  if (config.jwtToken) {
    return config.jwtToken;
  }

  // Если нет JWT токена, получаем его через /login
  console.log('🔵 [AutoFAQ] JWT токен отсутствует, выполняем логин...');
  const loginResult = await loginToAutoFAQ({ config, onRequest });

  if (loginResult.data) {
    // Сохраняем JWT токен в конфигурации
    config.jwtToken = loginResult.data;
    return loginResult.data;
  } else {
    console.error('❌ [AutoFAQ] Не удалось получить JWT токен:', loginResult.error);
    return null;
  }
};

/**
 * Отправка сообщения (вопроса) в AutoFAQ
 * POST /api/ext/v2/services/{serviceId}/{channelId}/questionsAsync
 */
export const sendQuestionToAutoFAQ = async ({ config, message, onRequest }: BaseAutoFAQRequest & { message: AutoFAQMessage }) => {
  // Сначала получаем JWT токен, если его нет
  const jwtToken = await ensureJWTToken(config, onRequest);
  
  if (!jwtToken) {
    return { error: new Error('Не удалось получить JWT токен для авторизации') };
  }

  const targetUrl = `${config.apiBaseUrl}/api/ext/v2/services/${config.serviceId}/${config.channelId}/questionsAsync`;
  const url = getProxyUrl(targetUrl);

  // Формируем body согласно документации AutoFAQ API
  // Документация: https://app.swaggerhub.com/apis-docs/AutoFAQ.ai/external-api
  const body: Record<string, unknown> = {
    text: message.text,
  };

  // Добавляем опциональные поля, если они есть
  if (message.dialogId) {
    body.dialogId = message.dialogId;
  }

  // clientId может быть частью channelUser или отдельным полем
  // В документации показан channelUser, но мы используем clientId для идентификации
  if (message.clientId) {
    body.clientId = message.clientId;
  }

  // metadata может содержать дополнительную информацию
  if (message.metadata && Object.keys(message.metadata).length > 0) {
    // Если в metadata есть channelUser, используем его
    if (message.metadata.channelUser) {
      body.channelUser = message.metadata.channelUser;
    }
    // Остальные поля metadata добавляем как есть
    Object.keys(message.metadata).forEach((key) => {
      if (key !== 'channelUser') {
        body[key] = message.metadata![key];
      }
    });
  }

  // Формируем заголовки: используем JWT токен (Bearer)
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (jwtToken) {
    headers.Authorization = `Bearer ${jwtToken}`;
  }

  // Логируем запрос для отладки
  console.log('📤 [AutoFAQ API] Отправка запроса:', {
    method: 'POST',
    url,
    targetUrl,
    headers: {
      ...headers,
      Authorization: headers.Authorization ? 'Basic ***' : '(отсутствует)',
    },
    body: {
      ...body,
      text: typeof body.text === 'string' ? body.text.substring(0, 100) + (body.text.length > 100 ? '...' : '') : body.text,
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

  // Получаем JWT токен, если его нет
  const jwtToken = await ensureJWTToken(config, onRequest);
  
  if (!jwtToken) {
    return { error: new Error('Не удалось получить JWT токен для авторизации') };
  }

  return sendRequest({
    method: 'PUT',
    url,
    body,
    headers: {
      Authorization: `Bearer ${jwtToken}`,
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
  // Получаем JWT токен, если его нет
  const jwtToken = await ensureJWTToken(config, onRequest);
  
  if (!jwtToken) {
    return { error: new Error('Не удалось получить JWT токен для авторизации') };
  }

  const targetUrl = `${config.apiBaseUrl}/api/ext/v2/dialogs/${dialogId}`;
  const url = getProxyUrl(targetUrl);

  return sendRequest({
    method: 'GET',
    url,
    headers: {
      Authorization: `Bearer ${jwtToken}`,
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

  // Получаем JWT токен, если его нет
  const jwtToken = await ensureJWTToken(config, onRequest);
  
  if (!jwtToken) {
    return { error: new Error('Не удалось получить JWT токен для авторизации') };
  }

  return sendRequest({
    method: 'POST',
    url,
    body,
    headers: {
      Authorization: `Bearer ${jwtToken}`,
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

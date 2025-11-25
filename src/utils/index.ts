export const isNotDefined = <T>(value: T | undefined | null): value is undefined | null => value === undefined || value === null;

export const isDefined = <T>(value: T | undefined | null): value is NonNullable<T> => value !== undefined && value !== null;

export const isEmpty = (value: string | undefined | null): value is undefined => value === undefined || value === null || value === '';

export const isNotEmpty = (value: string | undefined | null): value is string => value !== undefined && value !== null && value !== '';

export const sendRequest = async <ResponseData>(
  params:
    | {
        url: string;
        method: string;
        body?: Record<string, unknown> | FormData;
        type?: string;
        headers?: Record<string, any>;
        formData?: FormData;
        onRequest?: (request: RequestInit) => Promise<void>;
      }
    | string,
): Promise<{ data?: ResponseData; error?: Error }> => {
  try {
    const url = typeof params === 'string' ? params : params.url;

    // Формируем заголовки: всегда используем переданные заголовки, добавляем Content-Type для JSON
    const headers: Record<string, string> = {};
    if (typeof params !== 'string' && params.headers) {
      Object.assign(headers, params.headers);
    }

    // Добавляем Content-Type для JSON body, если его нет
    let body: string | FormData | undefined = undefined;
    if (typeof params !== 'string') {
      if (params.formData) {
        body = params.formData;
        // Для FormData не устанавливаем Content-Type - браузер установит автоматически с boundary
      } else if (isDefined(params.body)) {
        body = JSON.stringify(params.body);
        if (!headers['Content-Type']) {
          headers['Content-Type'] = 'application/json';
        }
      }
    }

    const requestInfo: RequestInit = {
      method: typeof params === 'string' ? 'GET' : params.method,
      mode: 'cors',
      headers: Object.keys(headers).length > 0 ? headers : undefined,
      body,
    };

    // Логируем заголовки для отладки (скрываем токены)
    if (typeof params !== 'string' && requestInfo.headers) {
      // Преобразуем headers в объект для безопасного доступа
      const logHeaders: Record<string, string> =
        requestInfo.headers instanceof Headers
          ? Object.fromEntries(requestInfo.headers.entries())
          : Array.isArray(requestInfo.headers)
            ? Object.fromEntries(requestInfo.headers)
            : { ...requestInfo.headers };

      if (logHeaders.Authorization) {
        logHeaders.Authorization = logHeaders.Authorization.substring(0, 20) + '...';
      }
      console.log('🔵 [sendRequest] Заголовки запроса:', logHeaders);
    }

    if (typeof params !== 'string' && params.onRequest) {
      await params.onRequest(requestInfo);
    }

    const response = await fetch(url, requestInfo);

    let data: any;
    const contentType = response.headers.get('Content-Type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else if (typeof params !== 'string' && params.type === 'blob') {
      data = await response.blob();
    } else {
      data = await response.text();
    }
    if (!response.ok) {
      let errorMessage;

      if (typeof data === 'object' && 'error' in data) {
        errorMessage = data.error;
      } else {
        errorMessage = data || response.statusText;
      }

      throw errorMessage;
    }

    return { data };
  } catch (e) {
    console.error(e);
    return { error: e as Error };
  }
};

export const setLocalStorageChatflow = (chatflowid: string, chatId: string, saveObj: Record<string, any> = {}) => {
  const chatDetails = localStorage.getItem(`${chatflowid}_EXTERNAL`);
  const obj = { ...saveObj };
  if (chatId) obj.chatId = chatId;

  if (!chatDetails) {
    localStorage.setItem(`${chatflowid}_EXTERNAL`, JSON.stringify(obj));
  } else {
    try {
      const parsedChatDetails = JSON.parse(chatDetails);
      localStorage.setItem(`${chatflowid}_EXTERNAL`, JSON.stringify({ ...parsedChatDetails, ...obj }));
    } catch (e) {
      const chatId = chatDetails;
      obj.chatId = chatId;
      localStorage.setItem(`${chatflowid}_EXTERNAL`, JSON.stringify(obj));
    }
  }
};

export const getLocalStorageChatflow = (chatflowid: string) => {
  const chatDetails = localStorage.getItem(`${chatflowid}_EXTERNAL`);
  if (!chatDetails) return {};
  try {
    return JSON.parse(chatDetails);
  } catch (e) {
    return {};
  }
};

export const removeLocalStorageChatHistory = (chatflowid: string) => {
  const chatDetails = localStorage.getItem(`${chatflowid}_EXTERNAL`);
  if (!chatDetails) return;
  try {
    const parsedChatDetails = JSON.parse(chatDetails);
    if (parsedChatDetails.lead) {
      // Dont remove lead when chat is cleared
      const obj = { lead: parsedChatDetails.lead };
      localStorage.removeItem(`${chatflowid}_EXTERNAL`);
      localStorage.setItem(`${chatflowid}_EXTERNAL`, JSON.stringify(obj));
    } else {
      localStorage.removeItem(`${chatflowid}_EXTERNAL`);
    }
  } catch (e) {
    return;
  }
};

export const getBubbleButtonSize = (size: 'small' | 'medium' | 'large' | number | undefined) => {
  if (!size) return 48;
  if (typeof size === 'number') return size;
  if (size === 'small') return 32;
  if (size === 'medium') return 48;
  if (size === 'large') return 64;
  return 48;
};

export const setCookie = (cname: string, cvalue: string, exdays: number) => {
  const d = new Date();
  d.setTime(d.getTime() + exdays * 24 * 60 * 60 * 1000);
  const expires = 'expires=' + d.toUTCString();
  document.cookie = cname + '=' + cvalue + ';' + expires + ';path=/';
};

export const getCookie = (cname: string): string => {
  const name = cname + '=';
  const decodedCookie = decodeURIComponent(document.cookie);
  const ca = decodedCookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) === 0) {
      return c.substring(name.length, c.length);
    }
  }
  return '';
};

export type UserData = {
  user_id?: string;
  user_name?: string;
  fio?: string; // ФИО пользователя
  token?: string; // Токен из cookies
};

/**
 * Получает токен sk_auth из cookies
 * @returns Токен sk_auth или пустая строка
 */
export const getTokenFromCookies = (): string => {
  // Читаем sk_auth из cookies
  return getCookie('sk_auth');
};

/**
 * Получает токен sk_auth из cookies
 * Если токена нет, возвращает данные гостя
 * @returns Объект с токеном sk_auth или guest_id
 */
export const getUserDataFromCookies = (): UserData => {
  // ВРЕМЕННО: используем хардкодный токен
  const token = '65d8b7956bc114f60ea7987cca961fbb';
  // const token = getTokenFromCookies(); // Читаем sk_auth из cookies

  // Если токена нет, используем значения по умолчанию
  if (!token) {
    // Генерируем временный guest_id, если его еще нет
    let guestId = getCookie('guest_id');
    if (!guestId) {
      guestId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      setCookie('guest_id', guestId, 365);
    }
    return {
      user_id: guestId,
      user_name: 'Гость',
      token: undefined,
    };
  }

  // Возвращаем только токен sk_auth
  // user_id и user_name будут получены из ответа auth запроса
  return {
    token,
  };
};

/**
 * Получает данные пользователя по токену из cookies
 * Читает sk_auth из cookies и делает запрос на {AUTH_API_URL}?sk_auth={sk_auth}
 * По умолчанию использует https://sk.ru/auth/user_info (можно переопределить через window.__AUTH_API_URL__)
 * Получает id и fio из ответа, сохраняет их в user_id и user_name
 * Если sk_auth нет - возвращает данные гостя (guest_id и "Гость")
 * @param onRequest - Callback для модификации запроса
 * @returns Данные пользователя (user_id и user_name из ответа auth или данные гостя)
 */
export const getUserDataWithAuth = async (onRequest?: (request: RequestInit) => Promise<void>): Promise<UserData> => {
  console.log('[getUserDataWithAuth] Начало получения данных пользователя');

  const userData = getUserDataFromCookies();
  console.log('[getUserDataWithAuth] Данные из cookies:', {
    hasToken: !!userData.token,
    user_id: userData.user_id,
    user_name: userData.user_name
  });

  // Если токена sk_auth нет, возвращаем данные гостя (не делаем запрос auth)
  if (!userData.token) {
    console.log('[getUserDataWithAuth] Токен отсутствует, возвращаем данные гостя');
    const guestData = {
      user_id: userData.user_id || 'guest',
      user_name: userData.user_name || 'Гость',
      token: undefined,
    };
    console.log('[getUserDataWithAuth] Возвращаем данные гостя:', guestData);
    return guestData;
  }

  console.log('[getUserDataWithAuth] Токен найден, делаем запрос auth');

  // Делаем запрос auth для получения id и fio
  // GET {AUTH_API_URL}?sk_auth={sk_auth} (по умолчанию https://sk.ru/auth/user_info)
  try {
    console.log('[getUserDataWithAuth] Импортируем authQuery');
    const { authQuery } = await import('@/queries/sendMessageQuery');

    console.log('[getUserDataWithAuth] Вызываем authQuery с токеном');
    const result = await authQuery({
      token: userData.token,
      onRequest,
    });

    console.log('[getUserDataWithAuth] Результат authQuery:', {
      hasError: !!result.error,
      hasData: !!result.data,
      error: result.error
    });

    // Если пришла ошибка от auth запроса, возвращаем данные гостя
    if (result.error || !result.data) {
      console.error('[getUserDataWithAuth] Ошибка auth запроса:', result.error);
      const guestData = {
        user_id: userData.user_id || 'guest',
        user_name: userData.user_name || 'Гость',
        token: undefined,
      };
      console.log('[getUserDataWithAuth] Возвращаем данные гостя из-за ошибки:', guestData);
      return guestData;
    }

    console.log('[getUserDataWithAuth] Данные из ответа auth:', result.data);

    // Получаем id и fio из ответа
    // id -> user_id, fio -> user_name
    const userDataResult: UserData = {
      ...userData,
      user_id: result.data.user_id || result.data.id || '', // id из ответа
      user_name: result.data.fio || 'Гость', // fio из ответа -> user_name
      fio: result.data.fio, // Сохраняем fio для справки
    };

    console.log('[getUserDataWithAuth] Итоговые данные пользователя:', userDataResult);
    return userDataResult;
  } catch (error) {
    console.error('[getUserDataWithAuth] Исключение при получении данных:', error);
    // В случае ошибки возвращаем данные гостя
    const guestData = {
      user_id: userData.user_id || 'guest',
      user_name: userData.user_name || 'Гость',
      token: undefined,
    };
    console.log('[getUserDataWithAuth] Возвращаем данные гостя из-за исключения:', guestData);
    return guestData;
  }
};

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


let skCompanyKeyCache: string | null = null;
let skCompanyKeyLoading: Promise<string | null> | null = null;

/**
 * Получает SK Company Key (по аналогии с AUTH_API_URL)
 * 1. Сначала проверяет window.__SK_COMPANY_KEY__ (для переопределения)
 * 2. Если нет, загружает из /api/config (из переменной окружения на сервере, один раз, с кэшированием)
 * 3. Если и там нет, использует значение по умолчанию
 * @returns SK Company Key
 */
const getSkCompanyKey = async (): Promise<string> => {
  if (typeof window !== 'undefined' && (window as any).__SK_COMPANY_KEY__) {
    return (window as any).__SK_COMPANY_KEY__;
  }

  if (skCompanyKeyCache !== null) {
    return skCompanyKeyCache;
  }

  if (skCompanyKeyLoading) {
    const key = await skCompanyKeyLoading;
    return key || 'XE4dZ1HOaOAKTCPn';
  }

  skCompanyKeyLoading = (async () => {
    try {
      const configResponse = await fetch('/api/config');
      if (configResponse.ok) {
        const config = await configResponse.json();
        const key = config.skCompanyKey;
        if (key) {
          skCompanyKeyCache = key;
          return key;
        }
      }
    } catch (e) {
      console.warn('⚠️ [Config] Не удалось загрузить SK Company Key из /api/config:', e);
    }
    return null;
  })();

  const key = await skCompanyKeyLoading;
  return key || '';
};

export type UserData = {
  user_id?: string;
  user_name?: string;
  fio?: string; // ФИО пользователя
  email?: string; // Email пользователя
  token?: string; // Токен из cookies
  shortname?: string; // Короткое название компании
  orn?: string; // ОРН компании
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
  const token = getTokenFromCookies(); // Читаем sk_auth из cookies

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
 * По умолчанию использует https://uat.sk.ru/auth/user_info/ (можно переопределить через window.__AUTH_API_URL__)
 * Получает id и fio из ответа, сохраняет их в user_id и user_name
 * Если sk_auth нет - возвращает данные гостя (guest_id и "Гость")
 *
 * @param onRequest - Callback для модификации запроса
 * @returns Данные пользователя (user_id и user_name из ответа auth или данные гостя)
 */
export const getUserDataWithAuth = async (onRequest?: (request: RequestInit) => Promise<void>): Promise<UserData> => {
  const userData = getUserDataFromCookies();

  // Если токена sk_auth нет, возвращаем данные гостя (не делаем запрос auth)
  if (!userData.token) {
    const guestData = {
      user_id: userData.user_id || 'guest',
      user_name: userData.user_name || 'Гость',
      token: undefined,
    };
    console.log('🔵 [Auth] Токен отсутствует → режим гостя', { user_id: guestData.user_id });
    return guestData;
  }

  // Делаем запрос auth для получения id и fio
  // GET {AUTH_API_URL}?sk_auth={sk_auth} (по умолчанию https://uat.sk.ru/auth/user_info/)
  try {
    const { authQuery } = await import('@/queries/sendMessageQuery');
    const result = await authQuery({
      token: userData.token,
      onRequest,
    });

    // Если пришла ошибка от auth запроса, возвращаем данные гостя
    if (result.error || !result.data) {
      console.error('❌ [Auth] Ошибка получения данных пользователя:', result.error);
      return {
        user_id: userData.user_id || 'guest',
        user_name: userData.user_name || 'Гость',
        token: undefined,
      };
    }

    // Получаем id, fio и email из ответа
    const lowerEmail = result.data.lower_email || '';
    
    // Делаем второй запрос для получения данных компании
    let shortname: string | undefined;
    let orn: string | undefined;
    
    if (lowerEmail && typeof lowerEmail === 'string') {
      try {
        const companyUrl = `https://lk2.uat.sk.ru/apps/api/company/v0/internal/user/${encodeURIComponent(lowerEmail)}/companies`;
        console.log('🔐 [Company] Запрос данных компании');
        
        // Получаем API ключ (по аналогии с AUTH_API_URL)
        const apiKey = await getSkCompanyKey();
        
        const companyResult = await sendRequest<Array<{ shortname?: string; orn?: string }> | { shortname?: string; orn?: string }>({
          method: 'GET',
          url: companyUrl,
          headers: {
            'X-Sk-Connect-Api-Key': apiKey,
          },
          onRequest,
        });

        if (companyResult.data && !companyResult.error) {
          // Обрабатываем случай, когда ответ - массив компаний (берем первую)
          const companyData = Array.isArray(companyResult.data) ? companyResult.data[0] : companyResult.data;
          if (companyData && typeof companyData === 'object') {
            shortname = companyData.shortname;
            orn = companyData.orn;
          }
        } else {
          console.warn('⚠️ [Company] Ошибка получения данных компании:', companyResult.error);
        }
      } catch (error) {
        console.error('❌ [Company] Исключение при получении данных компании:', error);
      }
    }

    const userDataResult: UserData = {
      ...userData,
      user_id: result.data.user_id || result.data.id || '', // id из ответа
      user_name: result.data.fio || 'Гость', // fio из ответа -> user_name
      fio: result.data.fio, // Сохраняем fio для справки
      email: result.data.email || lowerEmail, // Сохраняем email из ответа
      shortname, // Короткое название компании
      orn, // ОРН компании
    };

    console.log('✅ [Auth] Пользователь авторизован', {
      user_id: userDataResult.user_id,
      user_name: userDataResult.user_name,
      email: userDataResult.email,
      shortname: userDataResult.shortname,
      orn: userDataResult.orn,
    });
    return userDataResult;
  } catch (error) {
    console.error('❌ [Auth] Исключение при получении данных:', error);
    // В случае ошибки возвращаем данные гостя
    return {
      user_id: userData.user_id || 'guest',
      user_name: userData.user_name || 'Гость',
      token: undefined,
    };
  }
};

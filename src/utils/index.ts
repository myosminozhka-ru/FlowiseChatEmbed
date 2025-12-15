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
        // Логируем body перед сериализацией
        console.log('🔵 [sendRequest] Body перед сериализацией:', JSON.stringify(params.body, null, 2));
        body = JSON.stringify(params.body);
        console.log('🔵 [sendRequest] Body после сериализации (первые 500 символов):', body.substring(0, 500));
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
      obj.chatId = chatDetails;
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
  if (typeof document === 'undefined') return;
  const d = new Date();
  d.setTime(d.getTime() + exdays * 24 * 60 * 60 * 1000);
  const expires = 'expires=' + d.toUTCString();
  document.cookie = cname + '=' + cvalue + ';' + expires + ';path=/';
};

export const deleteCookie = (cname: string) => {
  if (typeof document === 'undefined') return;
  // Устанавливаем прошедшую дату, чтобы удалить cookie
  document.cookie = `${cname}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
};

export const getCookie = (cname: string): string => {
  if (typeof document === 'undefined') return '';
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
  email?: string; // Email пользователя
  token?: string; // Токен из cookies
  shortname?: string; // Короткое название компании
  orn?: string; // ОРН компании
};

// Типы для SK SDK
type SkCompany = {
  name: string;
  orn: number;
  ceo: boolean;
};

interface SkSdk {
  init: (config: { node: string }) => void;
  getCompanies: () => Promise<SkCompany[]>;
}

declare global {
  interface Window {
    SK?: SkSdk;
  }
}

/**
 * Получает токен sk_auth из cookies
 * @returns Токен sk_auth или пустая строка
 */
export const getTokenFromCookies = (): string => {
  // Читаем sk_auth из cookies
  return getCookie('sk_auth');
};

/**
 * Проверяет доступность SK SDK
 * На продакшене SK уже инициализирован глобально, поэтому просто проверяем его наличие
 * @returns true если SDK доступен, false если нет (для dev режима это нормально)
 */
const isSkSdkAvailable = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  return !!(window.SK && typeof window.SK.getCompanies === 'function');
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
    return {
      user_id: userData.user_id || 'guest',
      user_name: userData.user_name || 'Гость',
      token: undefined,
    };
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
    console.log('🔍 [Company] Проверка lowerEmail:', {
      lowerEmail,
      hasLowerEmail: !!lowerEmail,
      type: typeof lowerEmail,
      fromResult: result.data.lower_email,
      fullResultData: result.data,
    });

    // Получаем данные компании через SK SDK
    let shortname: string | undefined;
    let orn: string | undefined;

    // Проверяем доступность SK SDK (на продакшене он уже инициализирован)
    if (!isSkSdkAvailable()) {
      console.log('ℹ️ [Company] SK SDK не доступен (это нормально для dev режима)');
    } else {
      try {
        console.log('📥 [Company] Начинаем получение данных компании через SK SDK...');
        console.log('✅ [Company] SDK доступен, вызываем SK.getCompanies()...');

        // Вызываем метод SDK для получения компаний
        // SDK автоматически использует Cookie sk_auth для определения пользователя
        const companies = await window.SK!.getCompanies();

        console.log('📥 [Company] Ответ от SK.getCompanies():', {
          companiesCount: companies?.length || 0,
          isArray: Array.isArray(companies),
          companiesPreview: companies ? JSON.stringify(companies).substring(0, 200) : 'null',
        });

        if (companies && Array.isArray(companies) && companies.length > 0) {
          // Всегда берем первую компанию из массива (индекс 0), независимо от количества компаний
          const companyData = companies[0];
          console.log('🔍 [Company] Обработанные данные компании:', {
            companyData,
            name: companyData?.name,
            orn: companyData?.orn,
            ceo: companyData?.ceo,
          });

          if (companyData && typeof companyData === 'object' && companyData.name) {
            // Маппим name -> shortname для обратной совместимости
            shortname = companyData.name;
            // orn может быть числом, конвертируем в строку
            orn = companyData.orn?.toString();
            console.log('✅ [Company] Данные извлечены:', { shortname, orn });
          } else {
            console.warn('⚠️ [Company] companyData не является валидным объектом:', {
              companyData,
              type: typeof companyData,
              hasName: !!companyData?.name,
            });
          }
        } else {
          console.warn('⚠️ [Company] Массив компаний пуст или не является массивом:', {
            companies,
            isArray: Array.isArray(companies),
            length: companies?.length,
          });
        }
      } catch (error) {
        console.error('❌ [Company] Ошибка при получении данных компании через SK SDK:', {
          error,
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined,
        });
        // Не прерываем выполнение, просто не заполняем shortname и orn
        // Пользователь все равно получит остальные данные (user_id, user_name, email)
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

    console.log('✅ [Auth] Пользователь авторизован, итоговые данные:', {
      user_id: userDataResult.user_id,
      user_name: userDataResult.user_name,
      email: userDataResult.email,
      shortname: userDataResult.shortname,
      orn: userDataResult.orn,
      hasShortname: !!userDataResult.shortname,
      hasOrn: !!userDataResult.orn,
      lowerEmail,
      wasRequestMade: !!lowerEmail,
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

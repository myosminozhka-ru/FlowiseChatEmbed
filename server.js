Error.stackTraceLimit = 0;

import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import axios from 'axios';
import multer from 'multer';
import FormData from 'form-data';
import fs from 'fs';
import { generateEmbedScript } from './src/utils/embedScript.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_HOST = process.env.API_HOST;
const API_KEY = process.env.API_KEY;

const parseChatflows = () => {
  try {
    const chatflows = new Map();

    // Get all environment variables that don't start with special prefixes
    const chatflowVars = Object.entries(process.env).filter(([key]) => {
      return (
        !key.startsWith('_') &&
        !key.startsWith('npm_') &&
        !key.startsWith('yarn_') &&
        !key.startsWith('VSCODE_') &&
        key !== 'API_HOST' &&
        key !== 'API_KEY' &&
        key !== 'PORT' &&
        key !== 'HOST' &&
        key !== 'BASE_URL' &&
        key !== 'NODE_ENV'
      );
    });

    if (chatflowVars.length === 0) {
      console.error('No chatflow configurations found in environment variables');
      process.exit(1);
    }

    const defaultDomains = process.env.NODE_ENV === 'production' ? [] : ['http://localhost:5678'];

    for (const [identifier, value] of chatflowVars) {
      const parts = value.split(',').map((s) => s.trim());
      const chatflowId = parts[0];
      const configuredDomains = parts.length > 1 ? parts.slice(1) : [];

      const domains = [...new Set([...defaultDomains, ...configuredDomains])];

      if (!chatflowId) {
        console.error(`Missing chatflow ID for ${identifier}`);
        continue;
      }

      if (domains.includes('*')) {
        console.error(`\x1b[31mError: Wildcard (*) domains are not allowed in ${identifier}. This flow will not be accessible.\x1b[0m`);
        continue;
      }

      chatflows.set(identifier, { chatflowId, domains });
    }

    if (chatflows.size === 0) {
      console.error('No valid chatflow configurations found');
      process.exit(1);
    }

    return chatflows;
  } catch (error) {
    console.error('Failed to parse chatflow configurations:', error);
    process.exit(1);
  }
};

const chatflows = parseChatflows();

const getChatflowDetails = (identifier) => {
  let chatflow = chatflows.get(identifier);

  if (!chatflow) {
    const lowerIdentifier = identifier.toLowerCase();
    for (const [key, value] of chatflows.entries()) {
      if (key.toLowerCase() === lowerIdentifier) {
        chatflow = value;
        break;
      }
    }
  }

  if (!chatflow) {
    throw new Error(`Chatflow not found: ${identifier}`);
  }
  return chatflow;
};

const isValidUUID = (str) => {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidPattern.test(str);
};

const isValidChatflowConfig = (value) => {
  if (!value) return false;
  const parts = value.split(',').map((s) => s.trim());
  return isValidUUID(parts[0]);
};

console.info('\x1b[36m%s\x1b[0m', 'Configured chatflows:');
chatflows.forEach((config, identifier) => {
  if (isValidChatflowConfig(config.chatflowId)) {
    console.info('\x1b[36m%s\x1b[0m', `  ${identifier}: ${config.chatflowId} (${config.domains.join(', ')})`);
  }
});

const isValidDomain = (origin, domains, host) => {
  // Если origin отсутствует (прямой доступ к странице), разрешаем
  if (!origin) return true;

  // Нормализуем origin и host для сравнения (убираем протокол и порт)
  const normalizeOrigin = origin
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '')
    .split(':')[0];
  const normalizeHost = host
    ? host
        .replace(/^https?:\/\//, '')
        .replace(/\/$/, '')
        .split(':')[0]
    : '';

  // Если origin совпадает с host сервера (запрос с того же домена), разрешаем
  if (normalizeHost && normalizeOrigin === normalizeHost) {
    return true;
  }

  // Также проверяем, если origin содержит host (для поддоменов)
  if (normalizeHost && normalizeOrigin.endsWith('.' + normalizeHost)) {
    return true;
  }

  // Проверяем по списку разрешенных доменов
  return domains.includes(origin);
};

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'OPTIONS'],
    allowedHeaders: ['*'],
  }),
);

app.get('/', (_, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Обработка статических файлов из public (fullchat.html, index.html и т.д.)
app.get(/^\/[^/]+\.html$/, (req, res, next) => {
  const fileName = req.path.substring(1); // Убираем ведущий слэш
  const filePath = path.join(__dirname, 'public', fileName);

  // Проверяем, существует ли файл в public
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      // Если файл не найден, передаем управление дальше
      return next();
    }
    // Отправляем файл
    res.sendFile(filePath);
  });
});

// Обработка favicon.ico и других статических файлов
app.get('/favicon.ico', (_, res) => {
  res.status(204).end();
});

// Обработка /dist/web.js (прямой доступ к файлу)
app.get('/dist/web.js', (req, res) => {
  const origin = req.headers.origin;
  const host = req.headers.host;

  // Разрешаем доступ для localhost в dev режиме
  const isLocalhost = host && (host.includes('localhost') || host.includes('127.0.0.1'));
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev && isLocalhost) {
    res.set({
      'Content-Type': 'application/javascript',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    });
    return res.sendFile(path.join(__dirname, 'dist', 'web.js'));
  }

  const allAllowedDomains = Array.from(chatflows.values()).flatMap((config) => config.domains);

  // Разрешаем доступ, если origin совпадает с host или отсутствует
  if (!isValidDomain(origin, allAllowedDomains, host)) {
    return res.status(403).send('Access Denied');
  }

  res.set({
    'Content-Type': 'application/javascript',
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
  });
  res.sendFile(path.join(__dirname, 'dist', 'web.js'));
});

app.get('/web.js', (req, res) => {
  const origin = req.headers.origin;
  const host = req.headers.host;

  // Разрешаем доступ для localhost в dev режиме
  const isLocalhost = host && (host.includes('localhost') || host.includes('127.0.0.1'));
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev && isLocalhost) {
    res.set({
      'Content-Type': 'application/javascript',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    });
    return res.sendFile(path.join(__dirname, 'dist', 'web.js'));
  }

  const allAllowedDomains = Array.from(chatflows.values()).flatMap((config) => config.domains);

  // Разрешаем доступ, если origin совпадает с host или отсутствует
  if (!isValidDomain(origin, allAllowedDomains, host)) {
    return res.status(403).send('Access Denied');
  }

  res.set({
    'Content-Type': 'application/javascript',
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
  });
  res.sendFile(path.join(__dirname, 'dist', 'web.js'));
});

const validateApiKey = (req, res, next) => {
  // Разрешаем статические файлы и основные маршруты
  if (
    req.path === '/web.js' ||
    req.path === '/dist/web.js' ||
    req.path === '/' ||
    req.path === '/favicon.ico' ||
    req.path.startsWith('/dist/') ||
    req.path.startsWith('/public/') ||
    req.path.endsWith('.html') || // Разрешаем все HTML файлы (fullchat.html и т.д.)
    req.method === 'OPTIONS'
  ) {
    return next();
  }

  if (req.path.includes('/get-upload-file')) {
    return next();
  }

  // Разрешаем запросы к прокси AutoFAQ (CORS обход)
  if (req.path === '/api/v1/autofaq-proxy' || req.path.startsWith('/api/v1/autofaq-proxy/')) {
    return next();
  }

  let identifier;
  const pathParts = req.path.split('/').filter(Boolean);

  if (pathParts.length >= 3) {
    identifier = pathParts[3];
  } else {
    identifier = req.query.chatflowId?.split('/')[0];
  }

  if (!identifier) {
    return res.status(400).json({ error: 'Bad Request' });
  }

  let chatflow;
  try {
    chatflow = getChatflowDetails(identifier);
    req.chatflow = chatflow;
  } catch (error) {
    return res.status(404).json({ error: 'Not Found' });
  }

  const origin = req.headers.origin;
  const userAgent = req.headers['user-agent'];
  const acceptLanguage = req.headers['accept-language'];
  const accept = req.headers['accept'];
  const secFetchMode = req.headers['sec-fetch-mode'];
  const secFetchSite = req.headers['sec-fetch-site'];

  if (
    userAgent &&
    acceptLanguage &&
    accept &&
    secFetchMode === 'cors' &&
    secFetchSite &&
    ['same-origin', 'same-site', 'cross-site'].includes(secFetchSite)
  ) {
    const host = req.headers.host;
    if (isValidDomain(origin, chatflow.domains, host)) {
      return next();
    }
  }

  const authHeader = req.headers.authorization;
  if (API_KEY && authHeader && authHeader.startsWith('Bearer ') && authHeader.split(' ')[1] === API_KEY) {
    return next();
  }

  return res.status(401).json({ error: 'Unauthorized' });
};

app.use(validateApiKey);

const proxyEndpoints = {
  prediction: {
    method: 'POST',
    path: '/api/v1/prediction/:identifier',
    target: '/api/v1/prediction',
  },
  config: {
    method: 'GET',
    path: '/api/v1/public-chatbotConfig/:identifier',
    target: '/api/v1/public-chatbotConfig',
  },
  streaming: {
    method: 'GET',
    path: '/api/v1/chatflows-streaming/:identifier',
    target: '/api/v1/chatflows-streaming',
  },
  files: {
    method: 'GET',
    path: '/api/v1/get-upload-file',
    target: '/api/v1/get-upload-file',
  },
};

const handleProxy = async (req, res, targetPath) => {
  try {
    if (!API_HOST) {
      return res.status(500).json({ error: 'API_HOST is not configured. Proxy functionality is disabled.' });
    }

    let identifier = req.query.chatflowId?.split('/')[0] || req.path.split('/').pop() || null;

    if (!identifier) {
      return res.status(400).json({ error: 'Bad Request' });
    }

    const chatflow = getChatflowDetails(identifier);
    if (!chatflow) {
      return res.status(404).json({ error: 'Not Found' });
    }

    if (req.query.chatId && req.query.fileName) {
      const url = `${API_HOST}${targetPath}?chatflowId=${chatflow.chatflowId}&chatId=${req.query.chatId}&fileName=${req.query.fileName}`;

      const headers = {};
      if (API_KEY) {
        headers.Authorization = `Bearer ${API_KEY}`;
      }
      const response = await fetch(url, {
        method: req.method,
        headers,
      });

      if (!response.ok) {
        console.error(`File proxy error: ${response.status} ${response.statusText}`);
        return res.status(response.status).json({ error: `File proxy error: ${response.statusText}` });
      }

      const contentType = response.headers.get('content-type');
      if (contentType) {
        res.setHeader('Content-Type', contentType);
      }

      return response.body.pipe(res);
    }

    let finalPath = `${targetPath}/${chatflow.chatflowId}`;
    const url = `${API_HOST}${finalPath}`;

    const headers = {
      ...(req.method !== 'GET' && { 'Content-Type': 'application/json' }),
    };
    if (API_KEY) {
      headers.Authorization = `Bearer ${API_KEY}`;
    }
    const response = await fetch(url, {
      method: req.method,
      headers,
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined,
    });

    if (!response.ok) {
      console.error(`Proxy error: ${response.status} ${response.statusText}`);
      return res.status(response.status).json({ error: `Proxy error: ${response.statusText}` });
    }

    const contentType = response.headers.get('content-type');

    if (contentType?.includes('image/') || contentType?.includes('audio/') || contentType?.includes('application/octet-stream')) {
      res.setHeader('Content-Type', contentType);
      return response.body.pipe(res);
    }

    if (contentType?.includes('text/event-stream')) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      return response.body.pipe(res);
    }

    if (contentType?.includes('application/json')) {
      const data = await response.json();
      return res.json(data);
    }

    return response.body.pipe(res);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

Object.values(proxyEndpoints).forEach(({ method, path, target }) => {
  app[method.toLowerCase()](path, (req, res) => {
    return handleProxy(req, res, target);
  });
});

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.post('/api/v1/attachments/:identifier/:chatId', upload.array('files'), async (req, res) => {
  try {
    if (!API_HOST) {
      return res.status(500).json({ error: 'API_HOST is not configured. Proxy functionality is disabled.' });
    }

    const chatId = req.params.chatId;
    if (!chatId) {
      return res.status(400).json({ error: 'Bad Request' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Bad Request' });
    }

    const form = new FormData();
    req.files.forEach((file) => {
      form.append('files', file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype,
      });
    });

    const chatflow = req.chatflow;
    const targetUrl = `${API_HOST}/api/v1/attachments/${chatflow.chatflowId}/${chatId}`;

    const headers = {
      ...form.getHeaders(),
    };
    if (API_KEY) {
      headers.Authorization = `Bearer ${API_KEY}`;
    }
    const response = await axios.post(targetUrl, form, {
      headers,
    });

    res.json(response.data);
  } catch (error) {
    console.error('Attachment upload error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Прокси для AutoFAQ API (для обхода CORS)
app.all('/api/v1/autofaq-proxy', async (req, res) => {
  try {
    // Получаем целевой URL из query параметра
    const targetUrl = req.query.targetUrl;

    if (!targetUrl) {
      return res.status(400).json({ error: 'Bad Request', message: 'targetUrl parameter is required' });
    }

    // Декодируем URL
    const decodedUrl = decodeURIComponent(targetUrl);

    // Получаем метод запроса
    const method = req.method;

    // Формируем заголовки для запроса к AutoFAQ
    const headers = {
      'Content-Type': 'application/json',
    };

    // Копируем Authorization заголовок, если он есть
    // Express автоматически приводит заголовки к lowercase
    const authHeader = req.headers.authorization || req.headers['authorization'];
    if (authHeader) {
      headers.Authorization = authHeader;
      console.log('🔵 [AutoFAQ Proxy] Authorization заголовок найден:', authHeader.substring(0, 20) + '...');
    } else {
      console.log('⚠️ [AutoFAQ Proxy] Authorization заголовок отсутствует');
      console.log('🔵 [AutoFAQ Proxy] Все заголовки запроса:', Object.keys(req.headers));
    }

    // Формируем опции для запроса
    const fetchOptions = {
      method,
      headers,
    };

    // Добавляем тело запроса для POST, PUT, PATCH
    if (['POST', 'PUT', 'PATCH'].includes(method) && req.body) {
      fetchOptions.body = JSON.stringify(req.body);
    }

    // Логируем запрос к AutoFAQ API
    console.log('📤 [AutoFAQ Proxy] Отправка запроса к AutoFAQ:', {
      method,
      url: decodedUrl,
      hasAuth: !!headers.Authorization,
      authPrefix: headers.Authorization ? headers.Authorization.substring(0, 20) + '...' : 'нет',
      bodySize: fetchOptions.body ? JSON.stringify(fetchOptions.body).length : 0,
    });

    // Выполняем запрос к AutoFAQ API
    const response = await fetch(decodedUrl, fetchOptions);

    // Логируем ответ от AutoFAQ API
    console.log('📥 [AutoFAQ Proxy] Ответ от AutoFAQ:', {
      status: response.status,
      statusText: response.statusText,
      hasData: response.ok,
    });

    // Получаем данные ответа
    const contentType = response.headers.get('content-type');
    let data;

    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    // Устанавливаем статус ответа
    res.status(response.status);

    // Устанавливаем Content-Type
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }

    // Отправляем ответ
    if (contentType && contentType.includes('application/json')) {
      return res.json(data);
    } else {
      return res.send(data);
    }
  } catch (error) {
    console.error('AutoFAQ proxy error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

app.use((_req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
  const addr = server.address();
  if (!addr || typeof addr === 'string') return;

  let baseUrl;
  if (process.env.BASE_URL) {
    baseUrl = process.env.BASE_URL;
  } else if (process.env.NODE_ENV === 'production') {
    // В продакшене используем HOST из переменных окружения или формируем из HOST
    const host = process.env.HOST;
    if (host && !host.includes('localhost') && !host.includes('0.0.0.0')) {
      baseUrl = host.startsWith('http') ? host : `https://${host}`;
    } else {
      baseUrl = `https://${process.env.HOST || 'localhost'}`;
    }
  } else {
    // В development используем localhost с портом
    baseUrl = `http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${addr.port}`;
  }

  generateEmbedScript(baseUrl);
});

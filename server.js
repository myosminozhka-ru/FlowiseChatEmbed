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
import { spawn } from 'child_process';
import localtunnel from 'localtunnel';
import { generateEmbedScript } from './src/utils/embedScript.js';

dotenv.config();

// Константы и утилиты

const isDev = process.env.NODE_ENV === 'development';
const isProd = process.env.NODE_ENV === 'production';

const errorLog = (...args) => {
  console.error(...args); // Ошибки всегда логируем
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';
const DEV_BASE_URL = `http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`;

const CHAT_API_HOST = process.env.CHAT_API_HOST; // Адрес внешнего API (https://app.osmi-it.ru)
const API_KEY = process.env.API_KEY;
const SK_COMPANY_KEY = process.env.SK_COMPANY_KEY; // API ключ для запросов к компании

// Глобальная переменная для хранения tunnel URL (для прокси)
let tunnelUrl = null;

// Парсинг конфигурации chatflows

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
        key !== 'CHAT_API_HOST' &&
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

// Express приложение

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

// Endpoint для получения конфигурации из переменных окружения
app.get('/api/config', (_, res) => {
  const apiHost = process.env.API_HOST || CHAT_API_HOST || 'https://app.osmi-it.ru';
  const chatflowId = process.env.CHATFLOW_ID || '416feeac-4a95-4f6e-a81d-73f8f48bc54f';
  const welcomeTitle = process.env.WELCOME_TITLE || 'Привет! Я ваш виртуальный ассистент от Фонда «Сколково».';
  const welcomeText = process.env.WELCOME_TEXT || 'Задавайте мне вопросы об экосистеме так, словно обращаетесь к сотруднику Сколково.';

  res.json({
    apiHost,
    chatflowId,
    welcomeTitle,
    welcomeText,
    skCompanyKey: SK_COMPANY_KEY,
  });
});

// Отдача fullchat.html с встроенными переменными окружения
app.get('/fullchat.html', (_, res) => {
  const fullchatPath = path.join(__dirname, 'public', 'fullchat.html');
  let html = fs.readFileSync(fullchatPath, 'utf8');

  // Встраиваем конфигурацию напрямую из переменных окружения
  const config = {
    apiHost: process.env.API_HOST || CHAT_API_HOST || 'https://app.osmi-it.ru',
    chatflowId: process.env.CHATFLOW_ID || '416feeac-4a95-4f6e-a81d-73f8f48bc54f',
    welcomeTitle: process.env.WELCOME_TITLE || 'Привет! Я ваш виртуальный ассистент от Фонда «Сколково».',
    welcomeText: process.env.WELCOME_TEXT || 'Задавайте мне вопросы об экосистеме так, словно обращаетесь к сотруднику Сколково.'
  };

  // Заменяем пустой объект на реальную конфигурацию из переменных окружения
  const configString = JSON.stringify(config);
  html = html.replace('const config = {};', `const config = ${configString};`);

  res.send(html);
});

// Middleware для проверки доступа (домены и API ключ)
const validateApiKey = (req, res, next) => {
  // Разрешаем статические файлы и основные маршруты
  if (
    req.path === '/web.js' ||
    req.path === '/dist/web.js' ||
    req.path === '/' ||
    req.path === '/favicon.ico' ||
    req.path === '/api/config' || // Endpoint для получения конфигурации
    req.path.startsWith('/api/v1/autofaq/') || // Endpoint для AutoFAQ
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
    if (isDev) {
      chatflow = { chatflowId: identifier, domains: [DEV_BASE_URL] };
      req.chatflow = chatflow;
    } else {
      return res.status(404).json({ error: 'Not Found' });
    }
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

  return res.status(401).json({ error: 'Unauthorized' });
};

// Статические файлы (должны быть ДО validateApiKey, чтобы обрабатываться первыми)
const distPath = path.join(__dirname, 'dist');
const publicPath = path.join(__dirname, 'public');

// Явный маршрут для web.js файлов
app.get('/dist/web.js', (req, res) => {
  res.sendFile(path.join(distPath, 'web.js'));
});

app.get('/dist/web.umd.js', (req, res) => {
  res.sendFile(path.join(distPath, 'web.umd.js'));
});

app.get('/web.js', (req, res) => {
  res.sendFile(path.join(distPath, 'web.js'));
});

// Обработка маршрутов с динамической конфигурацией ДО статических файлов
app.get('/', (_, res) => {
  const indexPath = path.join(__dirname, 'public', 'index.html');
  let html = fs.readFileSync(indexPath, 'utf8');

  // Встраиваем конфигурацию напрямую из переменных окружения
  const config = {
    apiHost: process.env.API_HOST || CHAT_API_HOST || 'https://app.osmi-it.ru',
    chatflowId: process.env.CHATFLOW_ID || '416feeac-4a95-4f6e-a81d-73f8f48bc54f',
    welcomeTitle: process.env.WELCOME_TITLE || 'Привет! Я ваш виртуальный ассистент от Фонда «Сколково».',
    welcomeText: process.env.WELCOME_TEXT || 'Задавайте мне вопросы об экосистеме так, словно обращаетесь к сотруднику Сколково.'
  };

  // Заменяем пустой объект на реальную конфигурацию из переменных окружения
  const configString = JSON.stringify(config);
  html = html.replace('const config = {};', `const config = ${configString};`);

  res.send(html);
});

app.use('/dist', express.static(distPath));
app.use(express.static(distPath));
app.use(express.static(publicPath));

app.get('/', (_, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/favicon.ico', (_, res) => {
  res.status(204).end();
});

// Endpoint для передачи истории чата в AutoFAQ
app.post('/api/v1/autofaq/:chatflowId/transfer', async (req, res) => {
  try {
    const chatflowId = req.params.chatflowId;
    const { chatId, userMessage } = req.body;

    if (!chatId) {
      return res.status(400).json({ error: 'chatId не указан' });
    }

    // Проксируем запрос к основному API
    const apiHost = CHAT_API_HOST || 'https://app.osmi-it.ru';
    const apiUrl = `${apiHost}/api/v1/autofaq/${chatflowId}/transfer`;

    const headers = {
      'Content-Type': 'application/json',
    };

    if (API_KEY) {
      headers['Authorization'] = `Bearer ${API_KEY}`;
    }

    const response = await axios.post(apiUrl, { chatId, userMessage }, { headers });

    res.status(200).json(response.data);
  } catch (error) {
    errorLog('❌ [AutoFAQ] Ошибка передачи истории:', error);
    const statusCode = error.response?.status || 500;
    const errorMessage = error.response?.data?.message || error.message || 'Ошибка передачи истории в AutoFAQ';
    res.status(statusCode).json({ error: errorMessage });
  }
});

// Применяем валидацию только к API маршрутам, которые не являются статическими файлами
app.use(validateApiKey);

app.use((_req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// Запуск сервера
const server = app.listen(PORT, HOST, () => {
  const addr = server.address();
  if (!addr || typeof addr === 'string') return;

  let baseUrl;
  if (process.env.BASE_URL) {
    baseUrl = process.env.BASE_URL;
  } else if (process.env.NODE_ENV === 'production') {
    const host = process.env.HOST;
    if (host && !host.includes('localhost') && !host.includes('0.0.0.0')) {
      baseUrl = host.startsWith('http') ? host : `https://${host}`;
    } else {
      baseUrl = `https://${process.env.HOST || 'localhost'}`;
    }
  } else {
    baseUrl = `http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${addr.port}`;
  }

  if (isDev) {
    // Запуск Rollup в watch режиме после запуска сервера
    const rollupProcess = spawn('yarn', ['dev:build'], {
      stdio: 'inherit',
      shell: true,
    });

    rollupProcess.on('error', (error) => {
      errorLog('Ошибка запуска Rollup:', error);
    });

    // Запуск localtunnel для публичного доступа (не требует токена)
    let tunnel = null;
    (async () => {
      try {
        tunnel = await localtunnel({
          port: PORT,
          subdomain: 'sk-assist-chatwidget', // Кастомный subdomain
        });

        console.log(`\n🌐 [LocalTunnel] Публичный URL: ${tunnel.url}`);
        console.log(`\n📝 [Важно] Использование:`);
        console.log(`   - Браузер: работайте на localhost (http://localhost:${PORT}/fullchat.html)\n`);

        // Сохраняем URL для использования (для прокси)
        process.env.TUNNEL_URL = tunnel.url;
        tunnelUrl = tunnel.url; // Сохраняем в глобальную переменную для прокси

        // Обработка закрытия туннеля
        tunnel.on('close', () => {
          console.warn('\n⚠️ [LocalTunnel] Туннель закрыт');
        });

        tunnel.on('error', (err) => {
          errorLog('❌ [LocalTunnel] Ошибка туннеля:', err);
        });
      } catch (error) {
        errorLog('❌ [LocalTunnel] Не удалось запустить туннель:', error);
        console.warn('💡 [LocalTunnel] Запустите вручную: npx localtunnel --port 3001');
        console.warn('💡 [LocalTunnel] После запуска скопируйте URL\n');
      }
    })();

    process.on('SIGINT', async () => {
      rollupProcess.kill();
      if (tunnel) {
        try {
          tunnel.close();
        } catch (e) {
          // Игнорируем ошибки при закрытии туннеля
        }
      }
      process.exit();
    });

    process.on('SIGTERM', async () => {
      rollupProcess.kill();
      if (tunnel) {
        try {
          tunnel.close();
        } catch (e) {
          // Игнорируем ошибки при закрытии туннеля
        }
      }
      process.exit();
    });

    console.log(`\n✅ Dev сервер запущен: ${baseUrl}`);
    console.log(`📄 Откройте: ${baseUrl}/fullchat.html`);
  }

  generateEmbedScript(baseUrl);
});

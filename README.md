# Руководство по развертыванию Osmi AI Chat Embed на сервере

Это руководство предназначено для администраторов, которые разворачивают Osmi AI Chat Embed на сервере с помощью Docker.

## 📋 Содержание

- [Требования](#требования)
- [Быстрый старт](#быстрый-старт)
- [Настройка переменных окружения](#настройка-переменных-окружения)
- [Развертывание с Docker](#развертывание-с-docker)
- [Безопасность](#безопасность)
- [Использование после развертывания](#использование-после-развертывания)
- [Устранение неполадок](#устранение-неполадок)

---

## Требования

### Системные требования

- **Docker**: версия 20.10 или выше
- **Docker Compose**: версия 2.0 или выше
- **Доступ к AI платформе**: работающий экземпляр AI платформы с доступом к API

### Необходимые данные

Перед началом развертывания вам понадобятся:

1. **URL вашего AI инстанса** (например: `https://ai-platform.example.com`)
2. **API ключ** (Bearer token для аутентификации)
3. **Chatflow ID** - UUID ваших чат-ботов из AI платформы
4. **Домены**, на которых будет использоваться чат-бот

---

## Быстрый старт

### 1. Клонирование репозитория

```bash
git clone <repository-url>
cd OsmiChatEmbed
```

### 2. Настройка переменных окружения

Скопируйте файл `.env.example` в `.env` и заполните необходимые значения:

**Linux/Mac:**

```bash
cp .env.example .env
```

**Windows:**

```bash
copy .env.example .env
```

Затем отредактируйте `.env` файл и укажите ваши настройки. Подробное описание всех переменных смотрите в разделе [Настройка переменных окружения](#настройка-переменных-окружения).

### 3. Запуск с Docker Compose

```bash
docker-compose up -d
```

Сервер будет доступен по адресу: `http://localhost:3001`

---

## Настройка переменных окружения

### Обязательные переменные

#### `API_HOST`

URL вашего AI инстанса.

```bash
API_HOST=https://ai-platform.example.com
```

**Важно:** Не добавляйте слэш в конце URL.

#### `API_KEY` (опционально)

API ключ (Bearer token) для аутентификации в AI платформе. Если не указан, запросы будут проксироваться без заголовка Authorization.

```bash
API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Примечание:** Если ваш AI инстанс не требует авторизации или использует другой механизм аутентификации, эту переменную можно не указывать.

### Настройка Chatflows

Каждый chatflow настраивается через отдельную переменную окружения. **Важно:** имя переменной должно начинаться с префикса `chatflow_`, а значение должно содержать **только UUID chatflow** без дополнительных параметров.

Формат:

```
chatflow_[identifier]=[chatflowId]
```

Где:

- **chatflow\_[identifier]** - имя переменной с префиксом `chatflow_` (например: `chatflow_1`, `chatflow_support`, `chatflow_sales`)
- **chatflowId** - UUID вашего chatflow из AI платформы (только UUID, без доменов и других параметров)

#### Примеры конфигурации

**Один chatflow:**

```bash
chatflow_1=91e9c803-5169-4db9-8207-3c0915d71c5f
```

**Несколько chatflows:**

```bash
chatflow_1=91e9c803-5169-4db9-8207-3c0915d71c5f
chatflow_2=xyz789-uvw456-rst123-abc123-def456
chatflow_support=ghi123-jkl456-mno789-pqr123-stu456
```

**Важно:**

- Значение должно содержать **только UUID**, без запятых и доменов
- При использовании в коде используйте полный identifier с префиксом `chatflow_`. Например, для переменной `chatflow_1` используйте `chatflowid: 'chatflow_1'`

### Опциональные переменные

#### `PORT`

Порт, на котором будет работать сервер (по умолчанию: `3001`).

```bash
PORT=8080
```

#### `HOST`

Хост для привязки сервера (по умолчанию: `0.0.0.0`).

```bash
HOST=0.0.0.0
```

#### `BASE_URL`

Базовый URL вашего сервера (используется для генерации embed скрипта).

```bash
BASE_URL=https://chat.example.com
```

#### `NODE_ENV`

Режим работы: `development` или `production` (по умолчанию: `development`).

```bash
NODE_ENV=production
```

### Пример `.env` файла

Для быстрого старта используйте файл `.env.example` как шаблон. Он содержит все необходимые переменные с примерами значений.

**Важно:** Файл `.env` не должен попадать в систему контроля версий. Убедитесь, что он добавлен в `.gitignore`.

---

## Развертывание с Docker

### Структура Docker файлов

Проект включает следующие файлы для Docker развертывания:

- `Dockerfile` - образ для сборки и запуска приложения
- `docker-compose.yml` - конфигурация для запуска с Docker Compose

### Dockerfile

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Копируем файлы зависимостей
COPY package*.json ./
COPY yarn.lock ./
RUN yarn install --frozen-lockfile

# Копируем исходный код
COPY . .

# Собираем проект
RUN yarn build

# Открываем порт
EXPOSE 3001

# Запускаем сервер
CMD ["node", "server.js"]
```

### Docker Compose

Создайте или используйте существующий `docker-compose.yml`:

```yaml
version: '3.8'

services:
  osmi-chat-embed:
    build: .
    ports:
      - '${PORT:-3001}:3001'
    env_file:
      - .env
    restart: unless-stopped
    healthcheck:
      test: ['CMD', 'wget', '--quiet', '--tries=1', '--spider', 'http://localhost:3001/']
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

### Команды Docker Compose

**Запуск в фоновом режиме:**

```bash
docker-compose up -d
```

**Просмотр логов:**

```bash
docker-compose logs -f
```

**Остановка:**

```bash
docker-compose down
```

**Перезапуск:**

```bash
docker-compose restart
```

**Пересборка образа (после изменений в коде):**

```bash
docker-compose up -d --build
```

**Просмотр статуса:**

```bash
docker-compose ps
```

### Обновление приложения

Для обновления приложения до последней версии:

```bash
# Получите последние изменения из репозитория
git pull origin main

# Пересоберите и перезапустите контейнер
docker-compose up -d --build
```

### Работа с переменными окружения

Все переменные окружения читаются из файла `.env`. При изменении переменных:

1. Отредактируйте файл `.env`
2. Перезапустите контейнер:
   ```bash
   docker-compose restart
   ```

**Важно:** При изменении переменных, связанных с chatflows, может потребоваться полный перезапуск:

```bash
docker-compose down
docker-compose up -d
```

---

## Безопасность

### Рекомендации по безопасности

1. **Никогда не коммитьте `.env` файл в Git**

   - Добавьте `.env` в `.gitignore`
   - Используйте переменные окружения в Docker

2. **Используйте HTTPS в продакшн**

   - Настройте reverse proxy (Nginx, Caddy) перед Docker контейнером
   - Используйте SSL сертификаты (Let's Encrypt)

3. **Ограничьте доступ к API ключу**

   - Храните ключ только в `.env` файле
   - Не передавайте ключ в клиентский код

4. **Настройте домены правильно**

   - Указывайте только те домены, где действительно нужен чат-бот
   - Не используйте wildcard (`*`) для безопасности

5. **Используйте firewall**
   - Откройте только необходимые порты
   - Ограничьте доступ к серверу

### Настройка Nginx как Reverse Proxy

Пример конфигурации `/etc/nginx/sites-available/osmi-chat-embed`:

```nginx
server {
    listen 80;
    server_name chat.example.com;

    # Редирект на HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name chat.example.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Активация:

```bash
sudo ln -s /etc/nginx/sites-available/osmi-chat-embed /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## Использование после развертывания

После успешного развертывания вы можете встраивать чат-бот на своих сайтах:

### PopUp режим

```html
<script type="module">
  import Chatbot from 'https://your-server.com/web.js';
  Chatbot.init({
    chatflowid: 'chatflow_1', // Используйте identifier из .env (с префиксом chatflow_)
    apiHost: 'https://your-server.com',
  });
</script>
```

### FullPage режим

```html
<start-ai-fullchatbot></start-ai-fullchatbot>
<script type="module">
  import Chatbot from 'https://your-server.com/web.js';
  Chatbot.initFull({
    chatflowid: 'chatflow_1',
    apiHost: 'https://your-server.com',
  });
</script>
```

---

## Параметры инициализации чат-бота

### Методы инициализации

#### `Chatbot.init(props)` - Popup чат

Инициализирует всплывающий чат-бот (bubble).

#### `Chatbot.initFull(props)` - Полноэкранный чат

Инициализирует полноэкранный чат-бот.

### Основные параметры

| Параметр          | Тип                                       | Описание                                                                                               |
| ----------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `chatflowid`      | `string`                                  | Идентификатор chatflow. Если не указан, используется первый из `.env`. Можно получить из `/api/config` |
| `apiHost`         | `string`                                  | URL прокси-сервера. Если не указан, берется из `.env` (BASE_URL). Можно получить из `/api/config`      |
| `onRequest`       | `(request: RequestInit) => Promise<void>` | Callback для модификации запросов перед отправкой                                                      |
| `chatflowConfig`  | `Record<string, unknown>`                 | Дополнительная конфигурация chatflow                                                                   |
| `observersConfig` | `observersConfigType`                     | Конфигурация наблюдателей (callbacks для событий)                                                      |

**Примечание:** `chatflowid` и `apiHost` можно не указывать, если они есть в `.env` и вы используете `/api/config` для загрузки конфигурации.

### Параметры темы (через объект `theme`)

Рекомендуемый способ настройки внешнего вида чат-бота - использование объекта `theme`.

#### `theme.chatWindow` - Окно чата

| Параметр            | Тип        | Описание                                     |
| ------------------- | ---------- | -------------------------------------------- |
| `showTitle`         | `boolean`  | Показывать заголовок чата                    |
| `showAgentMessages` | `boolean`  | Показывать сообщения агента (для agentflows) |
| `title`             | `string`   | Текст заголовка                              |
| `titleAvatarSrc`    | `string`   | URL аватара в заголовке                      |
| `welcomeTitle`      | `string`   | Заголовок приветственного сообщения          |
| `welcomeText`       | `string`   | Текст приветственного сообщения              |
| `showWelcomeImage`  | `boolean`  | Показывать изображение приветствия           |
| `errorMessage`      | `string`   | Сообщение об ошибке                          |
| `backgroundImage`   | `string`   | URL фонового изображения                     |
| `height`            | `number`   | Высота окна в пикселях                       |
| `width`             | `number`   | Ширина окна в пикселях                       |
| `fontSize`          | `number`   | Размер шрифта                                |
| `sourceDocsTitle`   | `string`   | Заголовок для документов-источников          |
| `starterPrompts`    | `string[]` | Массив стартовых подсказок                   |
| `clearChatOnReload` | `boolean`  | Очищать чат при перезагрузке страницы        |
| `renderHTML`        | `boolean`  | Рендерить HTML в сообщениях                  |

#### `theme.chatWindow.userMessage` - Сообщения пользователя

| Параметр     | Тип       | Описание          |
| ------------ | --------- | ----------------- |
| `showAvatar` | `boolean` | Показывать аватар |
| `avatarSrc`  | `string`  | URL аватара       |

#### `theme.chatWindow.botMessage` - Сообщения бота

| Параметр     | Тип       | Описание          |
| ------------ | --------- | ----------------- |
| `showAvatar` | `boolean` | Показывать аватар |
| `avatarSrc`  | `string`  | URL аватара       |

#### `theme.chatWindow.textInput` - Поле ввода

| Параметр                 | Тип       | Описание                         |
| ------------------------ | --------- | -------------------------------- |
| `placeholder`            | `string`  | Текст placeholder                |
| `maxChars`               | `number`  | Максимальное количество символов |
| `maxCharsWarningMessage` | `string`  | Сообщение при превышении лимита  |
| `autoFocus`              | `boolean` | Автофокус на поле ввода          |

#### `theme.chatWindow.feedback` - Обратная связь

| Параметр  | Тип        | Описание                                       |
| --------- | ---------- | ---------------------------------------------- |
| `reasons` | `string[]` | Массив причин для отрицательной обратной связи |

#### `theme.chatWindow.footer` - Футер

| Параметр      | Тип       | Описание                |
| ------------- | --------- | ----------------------- |
| `showFooter`  | `boolean` | Показывать футер        |
| `text`        | `string`  | Текст футера            |
| `company`     | `string`  | Название компании       |
| `companyLink` | `string`  | Ссылка на сайт компании |

#### `theme.chatWindow.dateTimeToggle` - Дата и время

| Параметр | Тип       | Описание         |
| -------- | --------- | ---------------- |
| `date`   | `boolean` | Показывать дату  |
| `time`   | `boolean` | Показывать время |

#### `theme.button` - Кнопка чата (только для popup)

| Параметр         | Тип                                        | Описание                             |
| ---------------- | ------------------------------------------ | ------------------------------------ |
| `size`           | `'small' \| 'medium' \| 'large' \| number` | Размер кнопки (или число в пикселях) |
| `customIconSrc`  | `string`                                   | URL кастомной иконки                 |
| `bottom`         | `number`                                   | Отступ снизу в пикселях              |
| `right`          | `number`                                   | Отступ справа в пикселях             |
| `dragAndDrop`    | `boolean`                                  | Включить перетаскивание кнопки       |
| `autoWindowOpen` | `autoWindowOpenTheme`                      | Настройки автоматического открытия   |

##### `theme.button.autoWindowOpen`

| Параметр           | Тип       | Описание                             |
| ------------------ | --------- | ------------------------------------ |
| `autoOpen`         | `boolean` | Автоматически открывать окно         |
| `openDelay`        | `number`  | Задержка открытия в секундах         |
| `autoOpenOnMobile` | `boolean` | Автоматически открывать на мобильных |

#### `theme.tooltip` - Подсказка (только для popup)

| Параметр          | Тип       | Описание                |
| ----------------- | --------- | ----------------------- |
| `showTooltip`     | `boolean` | Показывать подсказку    |
| `tooltipMessage`  | `string`  | Текст подсказки         |
| `tooltipFontSize` | `number`  | Размер шрифта подсказки |

#### `theme.disclaimer` - Окно отказа от ответственности

| Параметр         | Тип      | Описание                            |
| ---------------- | -------- | ----------------------------------- |
| `title`          | `string` | Заголовок окна                      |
| `message`        | `string` | Текст сообщения (поддерживает HTML) |
| `buttonText`     | `string` | Текст кнопки принятия               |
| `denyButtonText` | `string` | Текст кнопки отмены                 |

#### `theme.customCSS` - Кастомный CSS

| Параметр    | Тип      | Описание            |
| ----------- | -------- | ------------------- |
| `customCSS` | `string` | Кастомные CSS стили |

**Примечание:** Все цвета настраиваются через Tailwind классы в `customCSS` или через CSS переменные. Параметры цветов (`backgroundColor`, `textColor`, `iconColor` и т.д.) **не поддерживаются** в публичном API.

### Примеры использования

#### Минимальная инициализация (данные из .env)

```javascript
// Вариант 1: Загрузка конфигурации с сервера (рекомендуется)
const config = await fetch('/api/config').then((r) => r.json());
Chatbot.init({
  chatflowid: config.chatflowid,
  apiHost: config.apiHost,
});

// Вариант 2: Явное указание (если нужен конкретный chatflow)
Chatbot.init({
  chatflowid: 'support', // Используйте identifier из .env
  apiHost: 'https://your-server.com',
});
```

#### С темой

```javascript
Chatbot.init({
  chatflowid: 'support',
  apiHost: 'https://your-server.com',
  theme: {
    chatWindow: {
      showTitle: true,
      title: 'Умный помощник',
      botMessage: {
        showAvatar: true,
      },
      userMessage: {
        showAvatar: true,
      },
      textInput: {
        placeholder: 'Введите сообщение...',
      },
    },
    button: {
      size: 'large',
    },
    customCSS: `
      /* Используйте Tailwind классы или CSS переменные */
      .chatbot-container {
        @apply bg-white;
      }
      .bot-message {
        @apply bg-gray-100;
      }
      .user-message {
        @apply bg-blue-500 text-white;
      }
    `,
  },
});
```

#### Полноэкранный чат

```javascript
Chatbot.initFull({
  chatflowid: 'support',
  apiHost: 'https://your-server.com',
  theme: {
    chatWindow: {
      showTitle: true,
      title: 'Умный помощник',
      botMessage: {
        showAvatar: true,
      },
      dateTimeToggle: {
        date: false,
        time: true,
      },
    },
  },
});
```

#### Загрузка конфигурации с сервера

```javascript
// Загружаем конфигурацию из .env
const config = await fetch('/api/config').then((r) => r.json());

Chatbot.init({
  chatflowid: config.chatflowid,
  apiHost: config.apiHost,
  // autofaqConfig загружается автоматически, если настроен в .env
});
```

### Примечания

1. **Конфигурация из .env**: Используйте endpoint `/api/config` для получения конфигурации с сервера. `chatflowid` и `apiHost` можно не указывать, если они есть в `.env`.

2. **Приоритет**: Параметры в объекте `theme` имеют приоритет над прямыми параметрами (устаревший способ).

3. **Полноэкранный режим**: Для `initFull()` параметры `theme.button` и `theme.tooltip` не применяются.

4. **Стилизация**: Все цвета настраиваются через Tailwind классы в `customCSS`. Параметры цветов не поддерживаются в публичном API.

5. **AutoFAQ**: Конфигурация AutoFAQ загружается автоматически из `.env` через `/api/config` и не должна передаваться при инициализации.

---

## Устранение неполадок

### Сервер не запускается

**Проблема:** `API_HOST is not set in environment variables`

**Решение:** Убедитесь, что переменная `API_HOST` установлена в `.env` файле. Проверьте, что файл `.env` существует и правильно настроен.

---

**Проблема:** `No chatflow configurations found`

**Решение:** Добавьте хотя бы одну конфигурацию chatflow в `.env` файл. Формат: `chatflow_[identifier]=chatflowId` (только UUID, без доменов). Имя переменной должно начинаться с префикса `chatflow_`.

---

**Проблема:** `Port 3001 is already in use`

**Решение:** Измените порт через переменную `PORT` в `.env` файле или освободите порт. В `docker-compose.yml` порт автоматически подхватится из переменной окружения.

---

### Docker проблемы

**Проблема:** Контейнер не запускается или сразу останавливается

**Решение:**

```bash
# Просмотрите логи для диагностики
docker-compose logs

# Проверьте статус контейнера
docker-compose ps

# Убедитесь, что .env файл существует и правильно настроен
cat .env
```

---

**Проблема:** Изменения в коде не применяются

**Решение:** Пересоберите образ:

```bash
docker-compose up -d --build
```

---

### Chatflow не работает

**Проблема:** `Chatflow not found: identifier`

**Решение:**

- Проверьте, что identifier в HTML совпадает с именем переменной в `.env`
- Убедитесь, что переменная окружения правильно настроена
- После изменения `.env` перезапустите контейнер: `docker-compose restart`

---

**Проблема:** `Access Denied` при загрузке `web.js`

**Решение:**

- Проверьте, что домен, с которого вы обращаетесь, указан в `allowedDomains` для данного chatflow
- Убедитесь, что вы используете правильный `identifier`
- Проверьте логи: `docker-compose logs`

---

### Проблемы с API

**Проблема:** `Unauthorized` ошибки

**Решение:**

- Если используется авторизация, проверьте правильность `API_KEY` в `.env` файле
- Убедитесь, что API ключ имеет необходимые права в AI платформе
- Если `API_KEY` не указан, убедитесь, что ваш AI инстанс не требует авторизации
- После изменения `.env` перезапустите контейнер

---

**Проблема:** `Proxy error: 404`

**Решение:**

- Проверьте правильность `chatflowId` (UUID) в `.env`
- Убедитесь, что chatflow существует в AI платформе
- Проверьте доступность `API_HOST` из контейнера:
  ```bash
  docker-compose exec osmi-chat-embed wget -O- $API_HOST
  ```

---

### Проблемы со сборкой

**Проблема:** Ошибки при сборке Docker образа

**Решение:**

```bash
# Очистите кэш Docker и пересоберите
docker-compose build --no-cache

# Или полностью пересоздайте контейнеры
docker-compose down
docker-compose up -d --build
```

---

## Просмотр логов

Для просмотра логов приложения:

```bash
# Все логи
docker-compose logs

# Логи в реальном времени
docker-compose logs -f

# Логи конкретного сервиса
docker-compose logs osmi-chat-embed

# Последние 100 строк
docker-compose logs --tail=100
```

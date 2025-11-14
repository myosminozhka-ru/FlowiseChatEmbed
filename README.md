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

#### `API_KEY`
API ключ (Bearer token) для аутентификации в AI платформе.

```bash
API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Настройка Chatflows

Каждый chatflow настраивается через отдельную переменную окружения. Формат:

```
[identifier]=[chatflowId],[allowedDomain1],[allowedDomain2],...
```

Где:
- **identifier** - любое имя для идентификации чат-бота (например: `support`, `sales`, `agent1`)
- **chatflowId** - UUID вашего chatflow из AI платформы
- **allowedDomains** - список разрешенных доменов через запятую (где можно встраивать чат)

#### Примеры конфигурации

**Один chatflow:**
```bash
support=91e9c803-5169-4db9-8207-3c0915d71c5f,https://example.com
```

**Несколько доменов:**
```bash
helpdesk=abc123-def456-ghi789,https://help.example.com,https://support.example.com
```

**Несколько chatflows:**
```bash
support=91e9c803-5169-4db9-8207-3c0915d71c5f,https://example.com
sales=xyz789-uvw456-rst123,https://sales.example.com
helpdesk=ghi123-jkl456-mno789,https://help.example.com,https://support.example.com
```

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
FROM node:18-alpine

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
      - "${PORT:-3001}:3001"
    env_file:
      - .env
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3001/"]
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
    chatflowid: 'support', // Используйте identifier из .env
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
    chatflowid: 'support',
    apiHost: 'https://your-server.com',
  });
</script>
```

---

## Параметры инициализации чат-бота

Компонент `Bot` принимает следующие параметры при инициализации:

### Обязательные параметры

- **`chatflowid`** (string, обязательный) - ID чатфлоу из OsmiAI

### Опциональные параметры подключения

- **`apiHost`** (string, опциональный) - URL вашего OsmiAI инстанса
- **`onRequest`** (function, опциональный) - Callback функция, вызываемая перед каждым API запросом
- **`chatflowConfig`** (object, опциональный) - Дополнительная конфигурация чатфлоу

### Параметры приветственного сообщения

- **`welcomeTitle`** (string, опциональный) - Заголовок приветственного сообщения
- **`welcomeText`** (string, опциональный) - Текст приветственного сообщения
- **`showWelcomeImage`** (boolean, опциональный, по умолчанию `true`) - Показывать ли изображение в приветственном сообщении

### Параметры включения/отключения функций

- **`showTitle`** (boolean, опциональный, по умолчанию `true`) - Показывать ли заголовок чата
- **`showAgentMessages`** (boolean, опциональный) - Показывать ли reasoning агентов при использовании agentflows
- **`isFullPage`** (boolean, опциональный) - Режим полноэкранного чата
- **`clearChatOnReload`** (boolean, опциональный) - Очищать ли историю чата при перезагрузке страницы
- **`renderHTML`** (boolean, опциональный) - Разрешить ли рендеринг HTML в сообщениях (по умолчанию HTML экранируется)
- **`enableCopyMessage`** (boolean, опциональный, по умолчанию `false`) - Включить ли кнопку копирования сообщений бота в буфер обмена

### Параметры заголовка

- **`title`** (string, опциональный) - Текст заголовка чата
- **`titleAvatarSrc`** (string, опциональный) - URL аватара в заголовке

### Параметры контента

- **`starterPrompts`** (string[] | Record<string, { prompt: string }>, опциональный) - Стартовые подсказки для быстрого ввода
- **`starterPromptFontSize`** (number, опциональный) - Размер шрифта стартовых подсказок
- **`sourceDocsTitle`** (string, опциональный) - Заголовок для секции источников документов
- **`errorMessage`** (string, опциональный) - Сообщение об ошибке

### Параметры размера

- **`fontSize`** (number, опциональный) - Базовый размер шрифта в пикселях

### Параметры обратных вызовов

- **`closeBot`** (function, опциональный) - Callback функция для закрытия чата
- **`observersConfig`** (observersConfigType, опциональный) - Конфигурация наблюдателей для отслеживания изменений:
  - `observeUserInput` - отслеживание ввода пользователя
  - `observeLoading` - отслеживание состояния загрузки
  - `observeMessages` - отслеживание сообщений

### Пример использования

```javascript
Chatbot.init({
  chatflowid: 'your-chatflow-id',
  apiHost: 'https://your-osmiai-instance.com',
  welcomeTitle: 'Добро пожаловать!',
  welcomeText: 'Задайте мне любой вопрос',
  showWelcomeImage: true,
  enableCopyMessage: true,
  showTitle: true,
  title: 'Мой чат-бот',
  fontSize: 16,
  clearChatOnReload: false,
  renderHTML: false,
  closeBot: () => console.log('Chat closed')
});
```

---

## Устранение неполадок

### Сервер не запускается

**Проблема:** `API_HOST is not set in environment variables`

**Решение:** Убедитесь, что переменная `API_HOST` установлена в `.env` файле. Проверьте, что файл `.env` существует и правильно настроен.

---

**Проблема:** `No chatflow configurations found`

**Решение:** Добавьте хотя бы одну конфигурацию chatflow в `.env` файл. Формат: `identifier=chatflowId,domain1,domain2`

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
- Проверьте правильность `API_KEY` в `.env` файле
- Убедитесь, что API ключ имеет необходимые права в AI платформе
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

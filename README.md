# Osmi AI Chat Embed

Библиотека для встраивания чат-бота на веб-сайты. Все настройки передаются через параметры инициализации.

## 📋 Содержание

- [Быстрый старт](#быстрый-старт)
- [Установка и сборка](#установка-и-сборка)
- [Развертывание с Docker](#развертывание-с-docker)
- [Использование](#использование)
- [Параметры инициализации](#параметры-инициализации)
- [Примеры](#примеры)

---

## Быстрый старт

### 1. Клонирование репозитория

```bash
git clone <repository-url>
cd FlowiseChatEmbed
```

### 2. Установка зависимостей

```bash
npm install
# или
yarn install
```

### 3. Сборка проекта

```bash
npm run build
# или
yarn build
```

После сборки файлы будут в папке `dist/`:

- `dist/web.js` - ES модуль
- `dist/web.umd.js` - UMD модуль

---

## Установка и сборка

### Разработка

Для разработки с автоматической пересборкой при изменениях:

```bash
npm run dev:build
```

Это запустит Rollup в watch-режиме и будет автоматически пересобирать проект при изменении файлов.

### Продакшн сборка

```bash
npm run build
```

---

## Использование

### Popup чат (Bubble)

```html
<script type="module">
  import Chatbot from 'https://your-cdn.com/web.js';

  Chatbot.init({
    chatflowid: 'your-chatflow-id',
    apiHost: 'https://your-api-host.com',
    apiKey: 'your-api-key', // Опционально
  });
</script>
```

### Полноэкранный чат

```html
<osmi-ai-fullchatbot></osmi-ai-fullchatbot>

<script type="module">
  import Chatbot from 'https://your-cdn.com/web.js';

  Chatbot.initFull({
    chatflowid: 'your-chatflow-id',
    apiHost: 'https://your-api-host.com',
    apiKey: 'your-api-key', // Опционально
  });
</script>
```

---

## Параметры инициализации

### Основные параметры

| Параметр          | Тип                                       | Описание                                                             |
| ----------------- | ----------------------------------------- | -------------------------------------------------------------------- |
| `chatflowid`      | `string`                                  | UUID вашего chatflow из AI платформы (обязательно)                   |
| `apiHost`         | `string`                                  | URL вашего AI инстанса (обязательно)                                 |
| `apiKey`          | `string`                                  | API ключ для авторизации (опционально, добавляется как Bearer token) |
| `onRequest`       | `(request: RequestInit) => Promise<void>` | Callback для модификации запросов перед отправкой (опционально)      |
| `chatflowConfig`  | `Record<string, unknown>`                 | Дополнительная конфигурация chatflow (опционально)                   |
| `observersConfig` | `observersConfigType`                     | Конфигурация наблюдателей (callbacks для событий) (опционально)      |
| `theme`           | `BubbleTheme`                             | Настройки темы (опционально)                                         |

### Параметры темы (через объект `theme`)

#### `theme.chatWindow` - Окно чата

| Параметр            | Тип        | Описание                                     |
| ------------------- | ---------- | -------------------------------------------- |
| `showTitle`         | `boolean`  | Показывать заголовок чата                    |
| `showAgentMessages` | `boolean`  | Показывать сообщения агента (для agentflows) |
| `title`             | `string`   | Текст заголовка                              |
| `titleAvatarSrc`    | `string`   | URL аватара в заголовке                      |
| `welcomeTitle`      | `string`   | Заголовок приветственного сообщения          |
| `welcomeText`       | `string`   | Текст приветственного сообщения. По умолчанию: "Задавайте мне вопросы так, будто общаетесь с реальным человеком" |
| `assistantGreeting` | `string`   | Приветствие ассистента для первого bubble. Если не указано, используется значение по умолчанию: "Я ваш AI-ассистент. Чем могу помочь?" |
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

**Примечание:** Все цвета настраиваются через Tailwind классы в `customCSS` или через CSS переменные.

---

## Примеры

### Минимальная инициализация

```javascript
import Chatbot from 'https://your-cdn.com/web.js';

Chatbot.init({
  chatflowid: '91e9c803-5169-4db9-8207-3c0915d71c5f',
  apiHost: 'https://ai-platform.example.com',
  apiKey: 'sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
});
```

### С темой

```javascript
import Chatbot from 'https://your-cdn.com/web.js';

Chatbot.init({
  chatflowid: 'your-chatflow-id',
  apiHost: 'https://ai-platform.example.com',
  apiKey: 'your-api-key',
  theme: {
    chatWindow: {
      showTitle: true,
      title: 'Умный помощник',
      welcomeText: 'Задавайте мне вопросы так, будто общаетесь с реальным человеком',
      assistantGreeting: 'Я ваш AI-ассистент Сколково. Чем могу помочь?',
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

### Полноэкранный чат

```javascript
import Chatbot from 'https://your-cdn.com/web.js';

Chatbot.initFull({
  chatflowid: 'your-chatflow-id',
  apiHost: 'https://ai-platform.example.com',
  apiKey: 'your-api-key',
  theme: {
    chatWindow: {
      showTitle: true,
      title: 'Умный помощник',
      welcomeText: 'Задавайте мне вопросы так, будто общаетесь с реальным человеком',
      assistantGreeting: 'Я ваш AI-ассистент Сколково. Чем могу помочь?',
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

### С кастомным onRequest

```javascript
import Chatbot from 'https://your-cdn.com/web.js';

Chatbot.init({
  chatflowid: 'your-chatflow-id',
  apiHost: 'https://ai-platform.example.com',
  onRequest: async (request) => {
    // Добавляем кастомные заголовки
    if (!request.headers) {
      request.headers = {};
    }
    request.headers['X-Custom-Header'] = 'value';

    // Или используем apiKey напрямую
    request.headers['Authorization'] = `Bearer your-api-key`;
  },
});
```

---

## Развертывание с Docker

### Быстрый старт

1. Клонируйте репозиторий:

```bash
git clone <repository-url>
cd FlowiseChatEmbed
```

2. Соберите и запустите Docker контейнер:

```bash
docker-compose up -d --build
```

Сервер будет доступен по адресу: `http://localhost:5678`

### Использование после развертывания

После запуска Docker контейнера файлы будут доступны по следующим URL:

- `http://your-server.com/web.js` - основной модуль чат-бота
- `http://your-server.com/dist/web.js` - альтернативный путь
- `http://your-server.com/index.html` - демо страница (popup)
- `http://your-server.com/fullchat.html` - демо страница (full page)

### Пример использования на сайте клиента

```html
<script type="module">
  import Chatbot from 'https://your-server.com/web.js';

  Chatbot.init({
    chatflowid: 'your-chatflow-id',
    apiHost: 'https://your-api-host.com',
    apiKey: 'your-api-key',
  });
</script>
```

### Настройка переменных окружения

В `docker-compose.yml` можно настроить следующие переменные окружения:

| Переменная | Описание | Значение по умолчанию |
|------------|----------|----------------------|
| `CHATFLOW_ID` | UUID вашего chatflow | `` |
| `API_HOST` | URL вашего AI инстанса | `http://localhost:3000` |
| `WELCOME_TITLE` | Заголовок приветственного сообщения | `Привет! Я ваш виртуальный ассистент от Фонда «Сколково».` |
| `WELCOME_TEXT` | Текст приветственного сообщения | `Задавайте мне вопросы об экосистеме так, словно обращаетесь к сотруднику Сколково.` |
| `PORT` | Порт для запуска сервера | `3001` |
| `HOST` | Хост для запуска сервера | `0.0.0.0` |

#### Использование через .env файл

Создайте файл `.env` в корне проекта:

```env
CHATFLOW_ID=your-chatflow-id
API_HOST=https://your-api-host.com
WELCOME_TITLE=Ваш заголовок
WELCOME_TEXT=Ваш текст приветствия
PORT=3001
HOST=0.0.0.0
```

Docker Compose автоматически загрузит переменные из `.env` файла.

#### Использование через переменные окружения

```bash
CHATFLOW_ID=your-chatflow-id API_HOST=https://your-api-host.com docker-compose up -d
```

#### Настройка порта

По умолчанию контейнер использует порт 3001. Чтобы изменить порт, установите переменную окружения:

```bash
PORT=8080 docker-compose up -d
```

Или отредактируйте `docker-compose.yml`:

```yaml
ports:
  - '8080:3001'
```

### Обновление приложения

Для обновления приложения до последней версии:

```bash
# Получите последние изменения из репозитория
git pull origin main

# Пересоберите и перезапустите контейнер
docker-compose up -d --build
```

### Просмотр логов

```bash
# Все логи
docker-compose logs

# Логи в реальном времени
docker-compose logs -f

# Последние 100 строк
docker-compose logs --tail=100
```

### Остановка и удаление

```bash
# Остановка
docker-compose down

# Остановка с удалением volumes
docker-compose down -v
```

---

## Развертывание без Docker

После сборки проекта (`npm run build`) файлы будут в папке `dist/`:

- `dist/web.js` - ES модуль (рекомендуется)
- `dist/web.umd.js` - UMD модуль

Загрузите эти файлы на ваш CDN или веб-сервер и используйте их в ваших HTML страницах.

### Пример развертывания на статический хостинг

1. Соберите проект: `npm run build`
2. Загрузите папку `dist/` на ваш хостинг
3. Используйте файлы в ваших HTML страницах:

```html
<script type="module">
  import Chatbot from 'https://your-domain.com/web.js';
  Chatbot.init({
    chatflowid: 'your-chatflow-id',
    apiHost: 'https://your-api-host.com',
    apiKey: 'your-api-key',
  });
</script>
```

---

## Примечания

1. **API ключ**: Если указан `apiKey`, он автоматически добавляется как `Authorization: Bearer <apiKey>` во все запросы к API.

2. **CORS**: Убедитесь, что ваш AI инстанс настроен для работы с CORS и разрешает запросы с ваших доменов.

3. **Безопасность**: Не храните API ключи в открытом виде в клиентском коде. Рассмотрите использование прокси-сервера для защиты ключей.

4. **Полноэкранный режим**: Для `initFull()` параметры `theme.button` и `theme.tooltip` не применяются.

5. **Стилизация**: Все цвета настраиваются через Tailwind классы в `customCSS`. Параметры цветов не поддерживаются в публичном API.

---

## Устранение неполадок

### Ошибка загрузки модуля

Убедитесь, что путь к `web.js` правильный и файл доступен.

### CORS ошибки

Проверьте настройки CORS на вашем AI инстансе. Убедитесь, что ваш домен разрешен для запросов.

### Ошибки авторизации

Проверьте правильность `apiKey` и что он имеет необходимые права в AI платформе.

### Chatflow не найден

Убедитесь, что `chatflowid` правильный (UUID) и chatflow существует в AI платформе.

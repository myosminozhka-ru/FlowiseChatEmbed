FROM node:20-alpine AS builder

WORKDIR /app

# Копируем файлы зависимостей
COPY package*.json ./
COPY yarn.lock ./
RUN yarn install --frozen-lockfile

# Копируем исходный код
COPY . .

# Собираем проект
RUN yarn build

# Финальный образ с nginx для раздачи статики
FROM nginx:alpine

# Копируем собранные файлы
COPY --from=builder /app/dist /usr/share/nginx/html/dist
COPY --from=builder /app/public /usr/share/nginx/html

# Копируем конфигурацию nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Открываем порт
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]


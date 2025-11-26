FROM node:20-alpine

WORKDIR /app

# Копируем файлы зависимостей
COPY package*.json ./
COPY yarn.lock ./

# Установка зависимостей с оптимизацией
RUN yarn install --ignore-engines --network-timeout 100000

COPY . .

RUN yarn build

ENV PORT=3001
EXPOSE 3001

CMD ["yarn", "start"]

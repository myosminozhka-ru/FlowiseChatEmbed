FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY yarn.lock ./

RUN yarn install --frozen-lockfile

COPY . .

RUN yarn build

ENV PORT=3001
EXPOSE 3001

CMD ["yarn", "start"]

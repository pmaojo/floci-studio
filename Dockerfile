FROM node:22-alpine

WORKDIR /app

# Instalamos dependencias en una capa estable para acelerar reconstrucciones locales.
COPY package.json pnpm-lock.yaml ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile

COPY . .

EXPOSE 3000

CMD ["pnpm", "run", "dev"]

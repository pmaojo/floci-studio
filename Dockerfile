FROM node:22-alpine

WORKDIR /app

# Instalamos dependencias en una capa estable para acelerar reconstrucciones locales.
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

EXPOSE 3000

CMD ["pnpm", "run", "dev"]

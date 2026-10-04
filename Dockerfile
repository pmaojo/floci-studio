FROM node:22-alpine

WORKDIR /app

# Instalamos dependencias en una capa estable para acelerar reconstrucciones locales.
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm@10.33.0 && pnpm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]

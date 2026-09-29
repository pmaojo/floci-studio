FROM node:22-alpine

WORKDIR /app

# Instalamos dependencias en una capa estable para acelerar reconstrucciones locales.
# Hacemos corepack enable y usamos pnpm ya que es el gestor requerido.
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]

FROM node:22-alpine

WORKDIR /app

# Instalamos dependencias en una capa estable para acelerar reconstrucciones locales.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]

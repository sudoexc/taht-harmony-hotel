FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* .
RUN npm install

COPY tsconfig.json tsconfig.build.json ./
COPY prisma ./prisma
COPY src ./src

RUN npm run build

EXPOSE 4000

CMD ["node", "dist/main.js"]

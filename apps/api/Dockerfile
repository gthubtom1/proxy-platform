FROM node:20-bookworm-slim

WORKDIR /app
COPY package.json package-lock.json* tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages packages
RUN npm install
COPY apps/api apps/api
RUN npm run prisma:generate && npm run build -w @proxy-platform/shared && npm run build -w @proxy-platform/db && npm run build -w @proxy-platform/api

CMD ["npm", "run", "start", "-w", "@proxy-platform/api"]

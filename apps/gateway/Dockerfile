FROM node:20-bookworm-slim

WORKDIR /app
COPY package.json package-lock.json* tsconfig.base.json ./
COPY apps/gateway/package.json apps/gateway/package.json
COPY packages/shared packages/shared
RUN npm install
COPY apps/gateway apps/gateway
RUN npm run build -w @proxy-platform/shared && npm run build -w @proxy-platform/gateway

CMD ["npm", "run", "start", "-w", "@proxy-platform/gateway"]

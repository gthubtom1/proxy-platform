FROM node:20-bookworm-slim

WORKDIR /app
COPY package.json package-lock.json* tsconfig.base.json ./
COPY apps/worker/package.json apps/worker/package.json
COPY packages packages
RUN npm install
COPY apps/worker apps/worker
RUN npm run prisma:generate && npm run build -w @proxy-platform/shared && npm run build -w @proxy-platform/db && npm run build -w @proxy-platform/worker

CMD ["npm", "run", "start", "-w", "@proxy-platform/worker"]

FROM node:20-bookworm-slim

WORKDIR /app
COPY package.json package-lock.json* tsconfig.base.json ./
COPY apps/web/package.json apps/web/package.json
RUN npm install
COPY apps/web apps/web
RUN npm run build -w @proxy-platform/web

CMD ["npm", "run", "preview", "-w", "@proxy-platform/web", "--", "--host", "0.0.0.0"]

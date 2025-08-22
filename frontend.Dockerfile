# ---- 依赖安装阶段 ----
FROM node:18-alpine AS dependencies

WORKDIR /app

COPY frontend/package.json frontend/package-lock.json ./
RUN npm install --legacy-peer-deps

# ---- 构建阶段 ----
FROM node:18-alpine AS builder

WORKDIR /app

COPY --from=dependencies /app/node_modules ./node_modules
COPY frontend/ .

RUN npm run build

# ---- 生产镜像阶段 ----
FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000

CMD ["npm", "start"]
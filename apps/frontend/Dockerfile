# ---- Build stage: deps + build frontend ----
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/frontend/package.json apps/frontend/package.json
RUN npm ci

COPY apps/frontend apps/frontend
RUN npm run build -w @erp/frontend

# ---- Runtime stage: serve statik + proxy API ke backend ----
FROM nginx:1.27-alpine

COPY --from=build /app/apps/frontend/dist /usr/share/nginx/html
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

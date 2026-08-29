# ---- Build stage: install deps + compile ----
FROM node:20-alpine AS build

WORKDIR /app

# Salin manifest untuk memanfaatkan cache layer npm ci
COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/package.json
RUN npm ci

# Salin kode backend
COPY apps/backend apps/backend

WORKDIR /app/apps/backend
RUN npm run prisma:generate && npm run build

# ---- Runtime stage: ringan, cukup node + prisma cli untuk migrate/seed ----
FROM node:20-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/apps/backend/package.json apps/backend/package.json
RUN npm ci

COPY --from=build /app/apps/backend apps/backend
WORKDIR /app/apps/backend

COPY apps/backend/docker-entrypoint.sh /app/apps/backend/docker-entrypoint.sh
RUN chmod +x docker-entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]

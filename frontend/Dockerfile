# -----------------------------------------------------------
# Pronokif Frontend — multi-stage Dockerfile
# Stage 1: node:20-alpine (build)
# Stage 2: nginx:alpine (serve) — target < 50 MB
# -----------------------------------------------------------

# ---- build stage ----
FROM node:20-alpine AS builder

WORKDIR /app

# Install deps first (better layer caching)
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

# Copy source and build
COPY . .

# Build-time env vars (override at `docker build --build-arg`)
ARG VITE_BACKEND_URL=http://localhost:8000
ARG VITE_SENTRY_DSN=
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL
ENV VITE_SENTRY_DSN=$VITE_SENTRY_DSN

RUN npm run build

# ---- serve stage ----
FROM nginx:alpine AS runtime

# Copy built assets
COPY --from=builder /app/build /usr/share/nginx/html

# Custom nginx config for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]

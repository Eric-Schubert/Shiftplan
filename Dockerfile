


FROM node:24-alpine AS deps

RUN apk add --no-cache python3 make g++

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci


FROM node:24-alpine AS builder

RUN apk add --no-cache python3 make g++

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Declared after the cacheable layers, so a new version does not rebuild them.
ARG APP_VERSION=0.0.0
RUN echo "${APP_VERSION}" > .version

RUN npm run build


FROM node:24-alpine

RUN apk add --no-cache libstdc++

WORKDIR /app


COPY --from=builder /app/.output ./.output


# setup.js and the entrypoint run without the Nitro bundle: they need the config loader (built-in
# defaults) and the migrations as plain JS. The optional config file is mounted to /app/config.
COPY --from=builder /app/setup.js ./setup.js
COPY --from=builder /app/server/lib/config ./server/lib/config
COPY --from=builder /app/server/utils/database-migrations.js ./server/utils/database-migrations.js
COPY --from=builder /app/server/lib/migrations ./server/lib/migrations
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3
COPY --from=builder /app/node_modules/bindings ./node_modules/bindings
COPY --from=builder /app/node_modules/file-uri-to-path ./node_modules/file-uri-to-path
COPY --from=builder /app/node_modules/prebuild-install ./node_modules/prebuild-install
COPY --from=builder /app/node_modules/bcryptjs ./node_modules/bcryptjs


COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

RUN mkdir -p /app/db /app/config && chown -R node:node /app

USER node

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/ || exit 1

EXPOSE 3000

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

ENTRYPOINT ["/docker-entrypoint.sh"]

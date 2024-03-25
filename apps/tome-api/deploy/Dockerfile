FROM oven/bun

WORKDIR /app

COPY --from=node:20-bookworm-slim /usr/local/bin/node /usr/local/bin/node

COPY package.json .
COPY pnpm-lock.yaml .
COPY pnpm-workspace.yaml .
COPY docker-entrypoint .
COPY turbo.json .

# Packages used by the app
COPY packages/eslint-config-custom ./packages/eslint-config-custom
COPY packages/tsconfig ./packages/tsconfig

# TODO: dont copy the whole app
COPY apps/tome-api ./apps/tome-api

RUN bunx pnpm install

ENV NODE_ENV production

WORKDIR /app/apps/tome-api

ENTRYPOINT ["/app/docker-entrypoint"]

CMD ["bun", "start"]



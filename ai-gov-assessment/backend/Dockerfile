# Single-stage image, intentionally not pruned to production-only deps.
# It is used for TWO roles in docker-compose.yml:
#   1. "backend"  — runs the compiled API server (node dist/server.js)
#   2. "db-init"  — one-shot migration + seed job (npm run db:migrate / db:seed),
#      which needs `tsx` (a devDependency) at runtime.
# Splitting these into a slim multi-stage runtime image is a reasonable
# follow-up once the app is past the 2-day build, but it would require a
# *second* image just for db-init — not worth the duplication yet.
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 4000

CMD ["node", "dist/server.js"]

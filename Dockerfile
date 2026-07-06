# ---- deps ----
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install

# ---- build ----
FROM node:22-alpine AS build
WORKDIR /app
# Baked into the browser bundle at build time. For the local self-host stack,
# docker-compose passes the proxy URL + local demo anon key so the browser
# Supabase client talks to the local GoTrue. Leaving them empty and setting
# NEXT_PUBLIC_DEV_AUTH=1 yields the zero-login dev bypass instead.
ARG NEXT_PUBLIC_DEV_AUTH=""
ARG NEXT_PUBLIC_SUPABASE_URL=""
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY=""
ENV NEXT_PUBLIC_DEV_AUTH=$NEXT_PUBLIC_DEV_AUTH \
    NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
    NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- run (next standalone output) ----
FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]

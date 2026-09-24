# ==============================================================================
# Dockerfile Multi-Stage para Backend NestJS + Prisma (BarberRed)
# ==============================================================================

# Etapa 1: Construcción
FROM node:20-alpine AS builder
WORKDIR /app

# Instalar dependencias
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci

# Generar cliente Prisma
RUN npx prisma generate

# Copiar código fuente y compilar
COPY . .
RUN npm run build

# Etapa 2: Imagen Ligera de Ejecución en Producción
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copiar dependencias de producción y cliente Prisma
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/main.js"]

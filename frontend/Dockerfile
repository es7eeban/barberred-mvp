# ==============================================================================
# Dockerfile Multi-Stage para Frontend React + Vite (BarberRed)
# ==============================================================================

# Etapa 1: Compilación de los activos estáticos
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Etapa 2: Servidor Web Ultraligero Nginx
FROM nginx:alpine
WORKDIR /usr/share/nginx/html

# Limpiar archivos por defecto de nginx
RUN rm -rf ./*

# Copiar build generado y configuración de Nginx para SPA
COPY --from=builder /app/dist .
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

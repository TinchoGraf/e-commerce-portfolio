# ---- Etapa 1: Compilar la app React ----
FROM node:20-alpine AS build

WORKDIR /app

# Copiar archivos de dependencias primero (para aprovechar la caché de Docker)
COPY package.json package-lock.json ./
RUN npm ci

# Copiar el resto del código y compilar
COPY . .
RUN npm run build

# ---- Etapa 2: Servir con Nginx ----
FROM nginx:alpine

# Copiar los archivos compilados al directorio que Nginx sirve por defecto
COPY --from=build /app/dist /usr/share/nginx/html

# Copiar configuración personalizada de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

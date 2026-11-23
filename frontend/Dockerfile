# ---- Desarrollo: ng serve con recarga en vivo; el código se monta desde el equipo ----
FROM node:24-alpine AS dev
WORKDIR /app
EXPOSE 4200
CMD ["sh", "-c", "npm install && npx ng serve --host 0.0.0.0 --port 4200 --poll 1000 --proxy-config proxy.conf.json"]

# ---- Compilación ----
FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- Producción: archivos estáticos servidos por Nginx ----
FROM nginx:1.27-alpine AS prod
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html
EXPOSE 80

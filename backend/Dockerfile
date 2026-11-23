# ---- Desarrollo: el código se monta desde el equipo y se recarga al guardar ----
FROM node:24-alpine AS dev
WORKDIR /app
EXPOSE 3000
CMD ["sh", "-c", "npm install && npm run start:dev"]

# ---- Compilación ----
FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- Producción: solo dependencias de producción y el código compilado ----
FROM node:24-alpine AS prod
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY assets ./assets
USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]

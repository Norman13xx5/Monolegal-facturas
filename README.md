# Monolegal · Recordatorios de facturas

Prueba técnica para el cargo de desarrollador full stack.

El sistema se conecta a MongoDB, revisa las facturas de cada cliente y, según su estado, envía un
correo y actualiza el estado:

| Estado encontrado | Correo que recibe el cliente | Estado nuevo |
|---|---|---|
| `primerrecordatorio` | «Su factura pasó a segundo recordatorio» | `segundorecordatorio` |
| `segundorecordatorio` | «Su servicio va a ser desactivado» | `desactivado` |
| cualquier otro | no se envía nada | sin cambios |

El estado **solo se actualiza si el correo se envió**. Funciona con 3 clientes de prueba e incluye
una interfaz web en Angular con el resumen de todas las facturas, la programación del envío
automático y el historial de envíos.

Seguimiento del trabajo (hecho / pendiente): [PROGRESO.md](PROGRESO.md).

---

## Contenido

1. [Requisitos](#1-requisitos)
2. [Despliegue rápido](#2-despliegue-rápido)
3. [Cómo probar el sistema (5 minutos)](#3-cómo-probar-el-sistema-5-minutos)
4. [Apagar y limpiar](#4-apagar-y-limpiar)
5. [Configuración opcional](#5-configuración-opcional)
6. [Solución de problemas](#6-solución-de-problemas)
7. [Modo desarrollo](#7-modo-desarrollo)
8. [Pruebas automáticas](#8-pruebas-automáticas)
9. [Arquitectura y API](#9-arquitectura-y-api)

---

## 1. Requisitos

| Requisito | Detalle |
|---|---|
| Docker | Docker Desktop (Windows, macOS) o Docker Engine con **Compose v2** (Linux). Comprobar con `docker compose version`. |
| Git | Para clonar el repositorio. |
| Puertos libres | **4200** (aplicación) y **8025** (buzón de correos). Se pueden cambiar (ver [sección 5](#5-configuración-opcional)). |

**No hace falta instalar** Node.js, Angular, NestJS ni MongoDB: todo se instala dentro de los contenedores.

---

## 2. Despliegue rápido

```bash
# 1. Clonar el repositorio
git clone https://github.com/Norman13xx5/Monolegal-facturas.git
cd Monolegal-facturas

# 2. Construir y levantar todo (la primera vez tarda unos minutos)
docker compose -f docker-compose.prod.yml up --build -d

# 3. Ver que los 4 servicios estén arriba
docker compose -f docker-compose.prod.yml ps
```

Cuando termine, abrir:

| Qué | Dirección |
|---|---|
| **Aplicación web** | http://localhost:4200 |
| **Buzón de correos** (aquí llegan los correos enviados) | http://localhost:8025 |
| Estado de los servicios (API, base de datos, correo) | http://localhost:4200/api/salud |

Si todo está bien, `/api/salud` responde `{"api":"ok","mongo":"ok","correo":"ok"}` y la cabecera de la
aplicación muestra **«Servicios en línea»** con un punto verde.

### Qué se levanta

| Contenedor | Función |
|---|---|
| `mongo` | Base de datos MongoDB 8. Al arrancar por primera vez se cargan solos **3 clientes y 9 facturas** de prueba. |
| `backend` | API en NestJS: proceso de recordatorios, envío de correos y tarea programada. |
| `frontend` | Aplicación Angular servida con Nginx (también reenvía `/api` al backend). |
| `mailpit` | Buzón de correo de pruebas. Recibe todos los correos: **no sale nada a internet**. |

---

## 3. Cómo probar el sistema (5 minutos)

Datos de prueba: 3 firmas de abogados ficticias, con facturas en estados mezclados a propósito
para comprobar que el proceso **solo toca** las que están en primer o segundo recordatorio.

| Factura | Cliente | Estado inicial |
|---|---|---|
| FAC-1001 | Gómez & Asociados Abogados S.A.S. | segundorecordatorio |
| FAC-1002 | Gómez & Asociados Abogados S.A.S. | primerrecordatorio |
| FAC-1003 | Gómez & Asociados Abogados S.A.S. | pagada |
| FAC-2001 | Ruiz Martínez Consultores Jurídicos | primerrecordatorio |
| FAC-2002 | Ruiz Martínez Consultores Jurídicos | pendiente |
| FAC-2003 | Ruiz Martínez Consultores Jurídicos | segundorecordatorio |
| FAC-3001 | Bufete Herrera Legal S.A.S. | desactivado |
| FAC-3002 | Bufete Herrera Legal S.A.S. | segundorecordatorio |
| FAC-3003 | Bufete Herrera Legal S.A.S. | primerrecordatorio |

**Paso a paso**

1. **Facturas** (http://localhost:4200): se ven 9 facturas por **$ 948.900**, el resumen por estado y por
   cliente. El texto superior dice «Ahora mismo procesaría 6 facturas».
2. Pulsar **«Ejecutar proceso ahora»**. Resultado esperado: *6 revisadas, 6 correos enviados, 0 fallidos*.
   - Las 3 en primer recordatorio pasan a **segundo recordatorio**.
   - Las 3 en segundo recordatorio pasan a **desactivado**.
   - FAC-1003 (pagada), FAC-2002 (pendiente) y FAC-3001 (ya desactivada) **no cambian**.
3. Abrir el **Buzón de correos** (enlace en el menú o http://localhost:8025): hay 6 correos, cada uno
   dirigido al correo del cliente dueño de la factura.
4. Pulsar de nuevo «Ejecutar proceso ahora»: 3 correos más (las de segundo recordatorio pasan a desactivado).
   Una tercera vez: 0 correos, ya no queda nada por procesar.
5. **Historial**: cada envío con su cambio de estado, resultado y origen (manual o automático).
6. **Programación**: activar el envío automático, poner **1 minuto** y guardar. Esperar un minuto:
   «Última ejecución automática» se actualiza y el Historial muestra envíos con origen *Automático*.
   Desactivarlo al terminar.
7. **«Reiniciar datos de prueba»** (vista Facturas) devuelve las 9 facturas a su estado inicial para
   repetir la prueba. El historial se conserva.

> El selector «Cambiar estado (prueba)» de cada fila permite poner una factura en cualquier estado
> a mano, para armar otros escenarios.

**Comprobar que un correo fallido no cambia el estado** (opcional):

```bash
docker compose -f docker-compose.prod.yml stop mailpit     # el servidor de correo deja de responder
# En la aplicación: «Ejecutar proceso ahora» → aviso de correos fallidos; los estados NO cambian
# y el Historial muestra los intentos como «Fallido».
docker compose -f docker-compose.prod.yml start mailpit
```

---

## 4. Apagar y limpiar

```bash
# Apagar conservando los datos
docker compose -f docker-compose.prod.yml down

# Apagar y borrar también la base de datos (la próxima vez arranca con los datos de prueba iniciales)
docker compose -f docker-compose.prod.yml down -v
```

---

## 5. Configuración opcional

Funciona **sin ningún archivo de configuración**. Para cambiar algo, copiar el ejemplo y editarlo:

```bash
cp .env.example .env
```

| Variable | Por defecto | Para qué |
|---|---|---|
| `FRONTEND_PUERTO` | `4200` | Puerto de la aplicación web |
| `MAILPIT_PUERTO_WEB` | `8025` | Puerto del buzón de correos |
| `MONGO_URI` | `mongodb://mongo:27017/monolegal` | Usar otra base, por ejemplo MongoDB Atlas |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` | Mailpit | Enviar correos reales con otro servidor SMTP |
| `CORREO_REMITENTE` | `Monolegal <facturacion@monolegal.test>` | Remitente de los correos |

Después de cambiar el `.env`, volver a levantar: `docker compose -f docker-compose.prod.yml up --build -d`.

> Con un SMTP real, los clientes de prueba tienen correos ficticios (`.test`) que no existen:
> cambiarlos por direcciones propias antes de probar. El archivo `.env` **no se sube** al repositorio.

---

## 6. Solución de problemas

| Síntoma | Causa probable | Solución |
|---|---|---|
| `port is already allocated` | El puerto 4200 u 8025 está en uso | Cambiar `FRONTEND_PUERTO` / `MAILPIT_PUERTO_WEB` en `.env` |
| La página no carga justo después de levantar | La primera construcción aún no termina | Esperar y revisar `docker compose -f docker-compose.prod.yml ps` |
| Cabecera en rojo «Revisar servicios» | Mongo o el correo no responden | Abrir http://localhost:4200/api/salud para ver cuál; revisar logs |
| Se ve el ícono o una versión anterior | Caché del navegador | Recargar con Ctrl+Shift+R (Cmd+Shift+R en macOS) |
| Todas las facturas quedaron desactivadas | Se ejecutó el proceso varias veces (comportamiento esperado) | Botón «Reiniciar datos de prueba» |

Ver los registros:

```bash
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f frontend
```

---

## 7. Modo desarrollo

Para trabajar en el código con recarga automática (el código del equipo se monta en los contenedores):

```bash
docker compose up --build
```

| Qué | Dirección |
|---|---|
| Aplicación (Angular `ng serve`) | http://localhost:4200 |
| API directa | http://localhost:3000/api |
| Buzón de correos | http://localhost:8025 |
| MongoDB (para Compass u otra herramienta) | `mongodb://localhost:27017/monolegal` |

Al guardar un archivo en `backend/src` o `frontend/src`, el cambio se aplica solo. Si se crea una
**carpeta nueva**, puede ser necesario `docker compose restart frontend` (o `backend`).

No usar los dos modos a la vez: comparten los puertos 4200 y 8025.

---

## 8. Pruebas automáticas

Se ejecutan en un contenedor temporal de Node (no requieren nada instalado ni el sistema levantado):

```bash
# Backend: reglas del proceso (incluye «si el correo falla, el estado no cambia»)
docker run --rm -v "$PWD/backend":/app -w /app node:24-alpine sh -c "npm ci && npx vitest run"

# Frontend
docker run --rm -v "$PWD/frontend":/app -w /app node:24-alpine sh -c "npm ci && npx ng test --watch=false"
```

---

## 9. Arquitectura y API

```
navegador ──► frontend (Nginx + Angular) ──/api──► backend (NestJS) ──► mongo
                                                        │
                                                        └──SMTP──► mailpit (buzón de pruebas)
```

**Colecciones en MongoDB:** `empresas`, `facturas`, `historial_envios`, `configuracion_cron`.

**Endpoints** (en producción, a través de http://localhost:4200/api):

| Método | Ruta | Uso |
|---|---|---|
| GET | `/api/salud` | Estado de API, base de datos y correo |
| GET | `/api/facturas` | Facturas con los datos de su cliente |
| GET | `/api/facturas/resumen` | Totales por estado y por cliente |
| PATCH | `/api/facturas/:id/estado` | Cambiar el estado a mano (pruebas) |
| POST | `/api/recordatorios/ejecutar` | Ejecutar el proceso ahora |
| GET | `/api/historial?limite=100` | Últimos envíos |
| GET / PUT | `/api/cron` | Leer / guardar la programación (`{"activo":true,"intervaloMinutos":5}`) |
| POST | `/api/datos-prueba/reiniciar` | Devolver los datos de prueba al estado inicial |

**Decisiones de diseño**

- **Un correo por factura**, y el estado se actualiza **después** de confirmar el envío.
- La actualización exige que la factura siga en el estado leído: si alguien la cambió mientras tanto, no se pisa.
- **Una sola ejecución a la vez**: el envío automático y el botón manual no duplican correos.
- El envío automático **arranca apagado** y se configura desde la interfaz (1 minuto a 24 horas), sin reiniciar el servidor.
- Cada intento queda en el historial, también los fallidos y el motivo.

| Pieza | Tecnología |
|---|---|
| Backend | NestJS 12 · Node 24 · TypeScript · Mongoose |
| Frontend | Angular 22 · Nginx |
| Base de datos | MongoDB 8 |
| Correo | Nodemailer · Mailpit |
| Despliegue | Docker Compose |

---

*Prueba técnica · no es un producto oficial de Monolegal. Los datos, empresas y correos son ficticios.*

# Progreso del proyecto

Seguimiento de la prueba técnica: qué se pidió, qué está hecho y qué falta.

**Leyenda:** ✅ hecho y verificado · 🟡 hecho en parte · ⬜ pendiente

Última actualización: 23 de noviembre de 2026.

---

## 1. Requisitos de la prueba

| # | Requisito | Estado | Evidencia / nota |
|---|---|---|---|
| R1 | Conectarse a una base de datos MongoDB | ✅ | MongoDB 8 en Docker; `GET /api/salud` responde `mongo: ok` |
| R2 | Extraer las facturas de cada cliente | ✅ | `GET /api/facturas` (con datos de la empresa) |
| R3 | Revisar si el estado es `primerrecordatorio` o `segundorecordatorio` | ✅ | El proceso consulta solo esos dos estados; los demás se ignoran |
| R4 | Enviar un correo según el estado encontrado | ✅ | Un correo por factura: «segundo recordatorio» o «va a ser desactivado» |
| R5 | Después de enviar, actualizar el estado (`segundorecordatorio` / `desactivado`) | ✅ | Solo se actualiza si el correo salió; si falla, el estado no cambia |
| R6 | Funcionar con 3 clientes diferentes | ✅ | 3 empresas de prueba, cada una recibe sus propios correos |
| R7 | Interfaz gráfica (Angular) con el resumen de todas las facturas | ✅ | Vistas Facturas, Programación e Historial; probadas en navegador (ver 4.3) |

## 2. Requisitos de la entrega

| # | Entregable | Estado |
|---|---|---|
| E1 | Repositorio en GitHub compartido | ⬜ |
| E2 | Documento con resultado final, progreso y pasos a seguir | ⬜ |
| E3 | Correo con el enlace al repositorio y el documento adjunto | ⬜ |

---

## 3. Decisiones tomadas

| Tema | Decisión | Motivo |
|---|---|---|
| Backend | NestJS 12 (Node 24, TypeScript) | Estructura modular, buen encaje con Angular |
| Frontend | Angular 22 | Es la tecnología que nombra la prueba |
| Despliegue | Docker Compose (Mongo, Mailpit, backend, frontend) | El revisor lo levanta con un solo comando, sin instalar nada más |
| Modo desarrollo | Código montado en los contenedores con recarga al guardar | Trabajo ágil desde el editor |
| Modo producción | `docker-compose.prod.yml` con imágenes compiladas | Lo que se entrega para revisar |
| Correo | Mailpit (buzón local en `http://localhost:8025`); SMTP real configurable | El revisor ve los correos sin cuentas ni internet |
| Envíos | **Un correo por factura** | Literal del enunciado y más fácil de rastrear |
| Orden del proceso | Primero el correo, luego el estado | Si el correo falla, la factura no avanza sin que el cliente haya sido avisado |
| Cron | Configurable desde una pantalla; arranca **apagado** | Evita que el revisor encuentre todo desactivado al abrir la app |
| Concurrencia | Una sola ejecución a la vez | El cron y el botón «Ejecutar ahora» no duplican correos |
| Datos de prueba | 3 firmas de abogados ficticias, 9 facturas en estados mezclados; correos `.test` | Demuestra que el proceso ignora lo que no le corresponde |
| Marca | Pin verde y colores de Monolegal (`#AED831`), tipografía Roboto | Sin el logo con sello del MinTIC; pie «Prueba técnica · no oficial» |

---

## 4. Hecho

### 4.1 Ambiente ✅
- [x] Carpeta del proyecto `~/Desktop/monolegal`.
- [x] Esqueleto NestJS y Angular generado dentro de Docker (no requiere Node local).
- [x] Retirado el módulo de telemetría `@nestjs/observe` que trae NestJS 12 por defecto.
- [x] `docker-compose.yml` (desarrollo, recarga al guardar) y `docker-compose.prod.yml` (producción).
- [x] Nginx en producción: sirve Angular y reenvía `/api` al backend.
- [x] `.env.example` sin contraseñas, `.gitignore`, `.dockerignore`, `README.md`.
- [x] Verificado: recarga automática de backend y frontend; modo producción levanta y responde.

### 4.2 Backend ✅
- [x] Colecciones: `empresas`, `facturas`, `historial_envios`, `configuracion_cron`.
- [x] Carga inicial automática (base vacía) y reinicio de datos de prueba (idempotente, conserva el historial).
- [x] Proceso de recordatorios con registro de cada intento (enviado o fallido, con detalle).
- [x] Plantillas de correo HTML y texto plano con la marca (pin incrustado como imagen).
- [x] Cron dinámico: activar/desactivar e intervalo (1–1440 min) sin reiniciar el servidor.
- [x] Validación de datos de entrada (intervalo, estados válidos).
- [x] Endpoint de salud (`/api/salud`): API, Mongo y SMTP.

**Endpoints**

| Método | Ruta | Uso |
|---|---|---|
| GET | `/api/salud` | Estado del ambiente |
| GET | `/api/facturas` | Listado de facturas con su empresa |
| GET | `/api/facturas/resumen` | Totales por estado y por empresa |
| PATCH | `/api/facturas/:id/estado` | Cambiar el estado a mano (pruebas) |
| POST | `/api/recordatorios/ejecutar` | Ejecutar el proceso ya |
| GET | `/api/historial?limite=100` | Últimos envíos |
| GET / PUT | `/api/cron` | Leer / guardar la programación |
| POST | `/api/datos-prueba/reiniciar` | Volver los datos de prueba al estado inicial |

**Verificaciones realizadas**

| Prueba | Resultado |
|---|---|
| Ejecución 1 | 6 correos: 3 pasan a `segundorecordatorio`, 3 a `desactivado` |
| Ejecución 2 | 3 correos: los 3 restantes pasan a `desactivado` |
| Ejecución 3 | 0 correos |
| Facturas `pagada`, `pendiente` y ya `desactivado` | Sin cambios en todas las ejecuciones |
| Resumen | 9 facturas / $948.900, igual a la consulta directa en Mongo y a la suma manual por empresa |
| Cron real (cada 1 min) | Se ejecutó solo: 6 enviadas, 0 fallidas; luego se desactivó |
| Validaciones | Rechaza intervalo 0 y estado inexistente (HTTP 400) |
| Pruebas automáticas | 7/7 pasan (incluye «si el correo falla, el estado no cambia» y «correo antes que actualización») |

### 4.3 Frontend ✅
- [x] Cabecera con la marca (pin + «Monolegal»), menú, indicador de servicios, favicon y pie «no oficial».
- [x] **Facturas:** tarjetas por estado (cantidad y valor, sirven de filtro), resumen por cliente, filtros, tabla con estado en color y último correo.
- [x] Botones «Ejecutar proceso ahora» y «Reiniciar datos de prueba» (con confirmación) con aviso del resultado y enlace al buzón.
- [x] Cambio de estado manual por factura (herramienta de pruebas).
- [x] **Programación:** interruptor, intervalo en minutos u horas (1 min – 24 h) con validación, guardar/descartar; próxima y última ejecución y su resultado (se refresca cada 10 s).
- [x] **Historial:** fecha, factura, cliente/correo, estado anterior → nuevo, resultado, origen, detalle; filtros.
- [x] Formatos de Colombia (`$ 948.900`, `15 sept 2026`) y diseño adaptable a celular.

**Verificación en navegador (Chromium con Playwright, como usuario)**

| Prueba | Resultado |
|---|---|
| Tarjetas iniciales | 9 / $948.900; pendiente 1, primer 3 ($379.700), segundo 3 ($189.500), desactivado 1, pagada 1 — igual a la API y a Mongo |
| Botón «Ejecutar proceso ahora» | Aviso «6 revisadas, 6 enviadas, 0 fallidas»; tarjetas: primer 0, segundo 3 ($379.700), desactivado 4 ($229.400) — cuadradas a mano |
| Filtro por tarjeta «Desactivado» | 4 de 9 filas |
| Cambio manual FAC-2002 | Pendiente → Primer recordatorio y de vuelta |
| Programación | Intervalo 0 bloqueado («El mínimo es 1 minuto»); activar cada 2 min muestra próxima ejecución; desactivar la borra |
| Historial | 21 registros, igual a la base |
| Celular (390 px) | Sin desbordamiento horizontal de la página |
| Correos en Mailpit | Plantillas «Segundo recordatorio» y «Aviso de desactivación» con marca y datos correctos |
| Consola del navegador | 0 errores |
| Pruebas automáticas | Frontend 2/2, backend 7/7 |

---

## 5. Falta

### 5.1 Cierre técnico ⬜
- [ ] Volver a probar `docker-compose.prod.yml` con todo terminado, desde una base vacía (la ejecución automática de esta prueba fue bloqueada por permisos; la ejecuta el usuario).
- [ ] Prueba en vivo del fallo de correo (detener Mailpit, ejecutar, comprobar que el estado no cambia).
- [ ] Actualizar `README.md`: endpoints, datos de prueba, cómo probar paso a paso.
- [ ] Borrar `backend/CLAUDE.md` y `backend/AGENTS.md` (los crea el generador de NestJS).
- [ ] Capturas de pantalla: facturas, cron, historial, correos en Mailpit, base antes/después.

### 5.2 Entrega ⬜
- [ ] `git init`, primer commit y repositorio público en GitHub.
- [ ] Documento (Word o PDF): resultado final, progreso, pasos a seguir, capturas.
- [ ] Correo con el enlace al repositorio y el documento adjunto.

---

## 6. Pasos a seguir (mejoras fuera del alcance de la prueba)
- Autenticación de usuarios para la interfaz y la API.
- Reintentos automáticos para correos fallidos y alertas al equipo de cartera.
- Bloqueo de ejecución en la base de datos (para varias instancias del backend).
- Plantillas de correo editables desde la interfaz.
- Paginación y filtros en facturas e historial.
- Pruebas de punta a punta (e2e) en un pipeline de CI.
- Despliegue en la nube (por ejemplo, MongoDB Atlas + un servicio de contenedores).

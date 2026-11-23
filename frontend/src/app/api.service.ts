import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  ConfiguracionCron,
  EstadoFactura,
  Factura,
  HistorialEnvio,
  ResultadoProceso,
  ResumenFacturas,
} from './modelos';

/** Acceso a la API del backend (todas las rutas bajo /api). */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  facturas() {
    return this.http.get<Factura[]>('/api/facturas');
  }

  resumen() {
    return this.http.get<ResumenFacturas>('/api/facturas/resumen');
  }

  cambiarEstado(id: string, estado: EstadoFactura) {
    return this.http.patch<Factura>(`/api/facturas/${id}/estado`, { estado });
  }

  ejecutarProceso() {
    return this.http.post<ResultadoProceso>('/api/recordatorios/ejecutar', {});
  }

  reiniciarDatos() {
    return this.http.post<{ empresas: number; facturas: number }>('/api/datos-prueba/reiniciar', {});
  }

  historial(limite = 200) {
    return this.http.get<HistorialEnvio[]>('/api/historial', { params: { limite } });
  }

  cron() {
    return this.http.get<ConfiguracionCron>('/api/cron');
  }

  guardarCron(activo: boolean, intervaloMinutos: number) {
    return this.http.put<ConfiguracionCron>('/api/cron', { activo, intervaloMinutos });
  }
}

/** Convierte un error HTTP en un mensaje legible para el usuario. */
export function mensajeError(e: unknown): string {
  if (e instanceof HttpErrorResponse) {
    if (e.status === 0) return 'No se pudo contactar el servidor. ¿Está levantado el backend?';
    const m = e.error?.message;
    if (Array.isArray(m)) return m.join(' ');
    if (typeof m === 'string') return m;
    return `Error ${e.status} del servidor.`;
  }
  return 'Ocurrió un error inesperado.';
}

/** Dirección del buzón de pruebas Mailpit (mismo equipo, puerto 8025). */
export function urlMailpit(): string {
  return `${location.protocol}//${location.hostname}:8025`;
}

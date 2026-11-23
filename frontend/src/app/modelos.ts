export type EstadoFactura =
  | 'pendiente'
  | 'primerrecordatorio'
  | 'segundorecordatorio'
  | 'desactivado'
  | 'pagada';

export const ESTADOS: { valor: EstadoFactura; etiqueta: string }[] = [
  { valor: 'pendiente', etiqueta: 'Pendiente' },
  { valor: 'primerrecordatorio', etiqueta: 'Primer recordatorio' },
  { valor: 'segundorecordatorio', etiqueta: 'Segundo recordatorio' },
  { valor: 'desactivado', etiqueta: 'Desactivado' },
  { valor: 'pagada', etiqueta: 'Pagada' },
];

export function etiquetaEstado(estado: string): string {
  return ESTADOS.find((e) => e.valor === estado)?.etiqueta ?? estado;
}

export interface Empresa {
  _id: string;
  nombre: string;
  nit: string;
  correo: string;
  contacto?: string;
}

export interface Factura {
  _id: string;
  numero: string;
  empresa: Empresa | null;
  concepto: string;
  valor: number;
  fechaEmision: string;
  fechaVencimiento: string;
  estado: EstadoFactura;
  ultimoEnvio: string | null;
}

export interface ResumenFacturas {
  total: number;
  valorTotal: number;
  porEstado: Record<EstadoFactura, { cantidad: number; valor: number }>;
  porEmpresa: { empresa: string; cantidad: number; valor: number }[];
}

export interface ResultadoProceso {
  ejecutado: boolean;
  motivo?: string;
  origen: 'manual' | 'automatico';
  inicio: string;
  fin: string;
  procesadas: number;
  enviadas: number;
  fallidas: number;
}

export interface ConfiguracionCron {
  activo: boolean;
  intervaloMinutos: number;
  ultimaEjecucion: string | null;
  proximaEjecucion: string | null;
  ultimoResultado: { procesadas: number; enviadas: number; fallidas: number } | null;
  enEjecucion: boolean;
}

export interface HistorialEnvio {
  _id: string;
  numeroFactura: string;
  empresa: string;
  correoDestino: string;
  estadoAnterior: EstadoFactura;
  estadoNuevo: EstadoFactura;
  resultado: 'enviado' | 'fallido';
  estadoActualizado: boolean;
  detalle: string | null;
  origen: 'manual' | 'automatico';
  fecha: string;
}

/** Estados posibles de una factura. */
export const ESTADOS_FACTURA = [
  'pendiente',
  'primerrecordatorio',
  'segundorecordatorio',
  'desactivado',
  'pagada',
] as const;

export type EstadoFactura = (typeof ESTADOS_FACTURA)[number];

/**
 * Regla de negocio de la prueba: estado actual -> estado al que pasa tras enviar el correo.
 * Solo estos dos estados se procesan; cualquier otro se ignora.
 */
export const TRANSICIONES: Readonly<Partial<Record<EstadoFactura, EstadoFactura>>> = {
  primerrecordatorio: 'segundorecordatorio',
  segundorecordatorio: 'desactivado',
};

export const ESTADOS_A_PROCESAR = Object.keys(TRANSICIONES) as EstadoFactura[];

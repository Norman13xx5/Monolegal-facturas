import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import type { HydratedDocument, Types } from 'mongoose';
import { ESTADOS_FACTURA } from '../comun/estados.js';
import type { EstadoFactura } from '../comun/estados.js';

export type OrigenEjecucion = 'manual' | 'automatico';

/**
 * Registro de cada intento de envío. Guarda copia del número de factura, la empresa y el correo
 * para que el historial siga siendo legible aunque se reinicien los datos de prueba.
 */
@Schema({ collection: 'historial_envios', timestamps: { createdAt: 'fecha', updatedAt: false } })
export class HistorialEnvio {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Factura', required: true })
  factura: Types.ObjectId;

  @Prop({ type: String, required: true })
  numeroFactura: string;

  @Prop({ type: String, required: true })
  empresa: string;

  @Prop({ type: String, required: true })
  correoDestino: string;

  @Prop({ type: String, enum: ESTADOS_FACTURA, required: true })
  estadoAnterior: EstadoFactura;

  /** Estado al que debía pasar. Si el envío falló, la factura conserva estadoAnterior. */
  @Prop({ type: String, enum: ESTADOS_FACTURA, required: true })
  estadoNuevo: EstadoFactura;

  @Prop({ type: String, enum: ['enviado', 'fallido'], required: true })
  resultado: 'enviado' | 'fallido';

  /** true si el estado se actualizó en la base de datos después de enviar el correo. */
  @Prop({ type: Boolean, required: true })
  estadoActualizado: boolean;

  @Prop({ type: String, default: null })
  detalle: string | null;

  @Prop({ type: String, enum: ['manual', 'automatico'], required: true })
  origen: OrigenEjecucion;

  @Prop({ type: String, default: null })
  idMensaje: string | null;

  fecha: Date;
}

export type HistorialEnvioDocument = HydratedDocument<HistorialEnvio>;
export const HistorialEnvioSchema = SchemaFactory.createForClass(HistorialEnvio);
HistorialEnvioSchema.index({ fecha: -1 });

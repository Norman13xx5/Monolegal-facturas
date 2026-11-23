import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import type { HydratedDocument, Types } from 'mongoose';
import { ESTADOS_FACTURA } from '../comun/estados.js';
import type { EstadoFactura } from '../comun/estados.js';
import { Empresa } from '../empresas/empresa.schema.js';

@Schema({ collection: 'facturas', timestamps: true })
export class Factura {
  @Prop({ type: String, required: true, unique: true, trim: true })
  numero: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Empresa.name, required: true, index: true })
  empresa: Types.ObjectId;

  @Prop({ type: String, required: true })
  concepto: string;

  /** Valor en pesos colombianos (entero, sin decimales). */
  @Prop({ type: Number, required: true, min: 0 })
  valor: number;

  @Prop({ type: Date, required: true })
  fechaEmision: Date;

  @Prop({ type: Date, required: true })
  fechaVencimiento: Date;

  @Prop({ type: String, enum: ESTADOS_FACTURA, required: true, index: true })
  estado: EstadoFactura;

  /** Fecha del último correo enviado con éxito para esta factura. */
  @Prop({ type: Date, default: null })
  ultimoEnvio: Date | null;
}

export type FacturaDocument = HydratedDocument<Factura>;
export const FacturaSchema = SchemaFactory.createForClass(Factura);

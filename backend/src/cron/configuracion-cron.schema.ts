import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';

export class ResultadoEjecucion {
  procesadas: number;
  enviadas: number;
  fallidas: number;
}

/** Documento único (_id = 'principal') con la programación del envío automático. */
@Schema({ collection: 'configuracion_cron', timestamps: true })
export class ConfiguracionCron {
  @Prop({ type: String })
  _id: string;

  @Prop({ type: Boolean, required: true, default: false })
  activo: boolean;

  @Prop({ type: Number, required: true, default: 5, min: 1, max: 1440 })
  intervaloMinutos: number;

  @Prop({ type: Date, default: null })
  ultimaEjecucion: Date | null;

  @Prop({ type: Date, default: null })
  proximaEjecucion: Date | null;

  @Prop({ type: Object, default: null })
  ultimoResultado: ResultadoEjecucion | null;
}

export type ConfiguracionCronDocument = HydratedDocument<ConfiguracionCron>;
export const ConfiguracionCronSchema = SchemaFactory.createForClass(ConfiguracionCron);

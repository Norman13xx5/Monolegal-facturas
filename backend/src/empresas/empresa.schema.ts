import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';

/** Cliente al que se le emiten las facturas. */
@Schema({ collection: 'empresas', timestamps: true })
export class Empresa {
  @Prop({ type: String, required: true, trim: true })
  nombre: string;

  @Prop({ type: String, required: true, unique: true, trim: true })
  nit: string;

  @Prop({ type: String, required: true, trim: true, lowercase: true })
  correo: string;

  @Prop({ type: String, trim: true })
  contacto?: string;
}

export type EmpresaDocument = HydratedDocument<Empresa>;
export const EmpresaSchema = SchemaFactory.createForClass(Empresa);

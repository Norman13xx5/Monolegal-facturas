import { Controller, DefaultValuePipe, Get, ParseIntPipe, Query } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { HistorialEnvio } from './historial-envio.schema.js';

@Controller('historial')
export class HistorialController {
  constructor(@InjectModel(HistorialEnvio.name) private readonly historial: Model<HistorialEnvio>) {}

  /** GET /api/historial?limite=100 : últimos intentos de envío, del más reciente al más antiguo. */
  @Get()
  listar(@Query('limite', new DefaultValuePipe(100), ParseIntPipe) limite: number) {
    return this.historial
      .find()
      .sort({ fecha: -1, _id: -1 })
      .limit(Math.min(Math.max(limite, 1), 500))
      .lean();
  }
}

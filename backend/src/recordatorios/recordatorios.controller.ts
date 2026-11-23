import { Controller, HttpCode, Post } from '@nestjs/common';
import { RecordatoriosService, type ResumenProceso } from './recordatorios.service.js';

@Controller('recordatorios')
export class RecordatoriosController {
  constructor(private readonly recordatorios: RecordatoriosService) {}

  /** POST /api/recordatorios/ejecutar: corre el proceso ya, sin esperar al cron. */
  @Post('ejecutar')
  @HttpCode(200)
  ejecutar(): Promise<ResumenProceso> {
    return this.recordatorios.ejecutar('manual');
  }
}

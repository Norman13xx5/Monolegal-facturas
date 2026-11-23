import { Controller, Get } from '@nestjs/common';
import { AppService, EstadoSalud } from './app.service.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /** GET /api/salud: estado de la API, la base de datos y el correo. */
  @Get('salud')
  salud(): Promise<EstadoSalud> {
    return this.appService.salud();
  }
}

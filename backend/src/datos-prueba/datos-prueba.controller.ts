import { Controller, HttpCode, Post } from '@nestjs/common';
import { DatosPruebaService } from './datos-prueba.service.js';

@Controller('datos-prueba')
export class DatosPruebaController {
  constructor(private readonly datos: DatosPruebaService) {}

  /** POST /api/datos-prueba/reiniciar: devuelve las facturas de prueba a su estado inicial. */
  @Post('reiniciar')
  @HttpCode(200)
  reiniciar() {
    return this.datos.cargar();
  }
}

import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { IsIn } from 'class-validator';
import { ESTADOS_FACTURA, type EstadoFactura } from '../comun/estados.js';
import { FacturasService } from './facturas.service.js';

export class CambiarEstadoDto {
  @IsIn(ESTADOS_FACTURA, { message: `estado debe ser uno de: ${ESTADOS_FACTURA.join(', ')}` })
  estado: EstadoFactura;
}

@Controller('facturas')
export class FacturasController {
  constructor(private readonly facturas: FacturasService) {}

  /** GET /api/facturas */
  @Get()
  listar() {
    return this.facturas.listar();
  }

  /** GET /api/facturas/resumen */
  @Get('resumen')
  resumen() {
    return this.facturas.resumen();
  }

  /** PATCH /api/facturas/:id/estado  { "estado": "primerrecordatorio" } */
  @Patch(':id/estado')
  cambiarEstado(@Param('id') id: string, @Body() dto: CambiarEstadoDto) {
    return this.facturas.cambiarEstado(id, dto.estado);
  }
}

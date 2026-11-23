import { Body, Controller, Get, Put } from '@nestjs/common';
import { IsBoolean, IsInt, Max, Min } from 'class-validator';
import { CronService } from './cron.service.js';

export class ActualizarCronDto {
  @IsBoolean()
  activo: boolean;

  @IsInt({ message: 'intervaloMinutos debe ser un número entero.' })
  @Min(1, { message: 'El intervalo mínimo es 1 minuto.' })
  @Max(1440, { message: 'El intervalo máximo es 1440 minutos (24 horas).' })
  intervaloMinutos: number;
}

@Controller('cron')
export class CronController {
  constructor(private readonly cron: CronService) {}

  /** GET /api/cron */
  @Get()
  obtener() {
    return this.cron.obtener();
  }

  /** PUT /api/cron  { "activo": true, "intervaloMinutos": 5 } */
  @Put()
  actualizar(@Body() dto: ActualizarCronDto) {
    return this.cron.actualizar(dto.activo, dto.intervaloMinutos);
  }
}

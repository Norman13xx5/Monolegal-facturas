import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { SchedulerRegistry } from '@nestjs/schedule';
import type { Model } from 'mongoose';
import { RecordatoriosService } from '../recordatorios/recordatorios.service.js';
import { ConfiguracionCron } from './configuracion-cron.schema.js';

const ID_CONFIG = 'principal';
const NOMBRE_TAREA = 'recordatorios-facturas';

@Injectable()
export class CronService implements OnApplicationBootstrap {
  private readonly logger = new Logger(CronService.name);

  constructor(
    @InjectModel(ConfiguracionCron.name) private readonly configuracion: Model<ConfiguracionCron>,
    private readonly registro: SchedulerRegistry,
    private readonly recordatorios: RecordatoriosService,
  ) {}

  /** Al arrancar, lee la configuración guardada y programa la tarea si está activa. */
  async onApplicationBootstrap(): Promise<void> {
    await this.programar(await this.obtener());
  }

  /** Devuelve la configuración; la crea (inactiva, cada 5 minutos) si no existe. */
  async obtener() {
    const cfg = await this.configuracion
      .findOneAndUpdate(
        { _id: ID_CONFIG },
        { $setOnInsert: { activo: false, intervaloMinutos: 5 } },
        { upsert: true, new: true },
      )
      .lean();
    return { ...cfg!, enEjecucion: this.recordatorios.enEjecucion };
  }

  /** Guarda la configuración y reprograma la tarea de inmediato. */
  async actualizar(activo: boolean, intervaloMinutos: number) {
    await this.configuracion.updateOne(
      { _id: ID_CONFIG },
      { $set: { activo, intervaloMinutos } },
      { upsert: true, runValidators: true },
    );
    await this.programar({ activo, intervaloMinutos });
    this.logger.log(
      activo ? `Envío automático activado cada ${intervaloMinutos} min.` : 'Envío automático desactivado.',
    );
    return this.obtener();
  }

  private async programar(cfg: { activo: boolean; intervaloMinutos: number }) {
    if (this.registro.doesExist('interval', NOMBRE_TAREA)) {
      this.registro.deleteInterval(NOMBRE_TAREA);
    }
    if (!cfg.activo) {
      await this.configuracion.updateOne({ _id: ID_CONFIG }, { $set: { proximaEjecucion: null } });
      return;
    }
    const ms = cfg.intervaloMinutos * 60_000;
    const intervalo = setInterval(() => void this.ejecutarProgramado(ms), ms);
    this.registro.addInterval(NOMBRE_TAREA, intervalo);
    await this.configuracion.updateOne(
      { _id: ID_CONFIG },
      { $set: { proximaEjecucion: new Date(Date.now() + ms) } },
    );
  }

  private async ejecutarProgramado(ms: number) {
    try {
      const r = await this.recordatorios.ejecutar('automatico');
      const cambios: Record<string, unknown> = { proximaEjecucion: new Date(Date.now() + ms) };
      if (r.ejecutado) {
        cambios.ultimaEjecucion = r.inicio;
        cambios.ultimoResultado = { procesadas: r.procesadas, enviadas: r.enviadas, fallidas: r.fallidas };
      }
      await this.configuracion.updateOne({ _id: ID_CONFIG }, { $set: cambios });
    } catch (e) {
      this.logger.error(`Fallo en la ejecución automática: ${(e as Error).message}`);
    }
  }
}

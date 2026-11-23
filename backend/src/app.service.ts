import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import { createTransport } from 'nodemailer';

export interface EstadoSalud {
  api: 'ok';
  mongo: 'ok' | 'error';
  correo: 'ok' | 'error';
  detalle?: string[];
}

@Injectable()
export class AppService {
  constructor(
    @InjectConnection() private readonly conexion: Connection,
    private readonly config: ConfigService,
  ) {}

  /** Comprueba que la base de datos y el servidor SMTP responden. */
  async salud(): Promise<EstadoSalud> {
    const detalle: string[] = [];
    let mongo: EstadoSalud['mongo'] = 'error';
    let correo: EstadoSalud['correo'] = 'error';

    try {
      await this.conexion.db?.admin().ping();
      mongo = 'ok';
    } catch (e) {
      detalle.push(`mongo: ${(e as Error).message}`);
    }

    try {
      const transporte = createTransport({
        host: this.config.get<string>('SMTP_HOST', 'localhost'),
        port: Number(this.config.get('SMTP_PORT', 1025)),
        secure: this.config.get('SMTP_SECURE') === 'true',
        auth: this.config.get('SMTP_USER')
          ? { user: this.config.get('SMTP_USER'), pass: this.config.get('SMTP_PASS') }
          : undefined,
      });
      await transporte.verify();
      correo = 'ok';
    } catch (e) {
      detalle.push(`correo: ${(e as Error).message}`);
    }

    return { api: 'ok', mongo, correo, ...(detalle.length ? { detalle } : {}) };
  }
}

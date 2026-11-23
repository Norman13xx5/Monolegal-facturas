import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model, Types } from 'mongoose';
import { ESTADOS_A_PROCESAR, TRANSICIONES } from '../comun/estados.js';
import { CorreoService } from '../correo/correo.service.js';
import { Empresa } from '../empresas/empresa.schema.js';
import { Factura } from '../facturas/factura.schema.js';
import { HistorialEnvio, type OrigenEjecucion } from '../historial/historial-envio.schema.js';

export interface ResumenProceso {
  ejecutado: boolean;
  motivo?: string;
  origen: OrigenEjecucion;
  inicio: Date;
  fin: Date;
  procesadas: number;
  enviadas: number;
  fallidas: number;
}

type FacturaConEmpresa = Omit<Factura, 'empresa'> & { _id: Types.ObjectId; empresa: Empresa | null };

@Injectable()
export class RecordatoriosService {
  private readonly logger = new Logger(RecordatoriosService.name);
  /** Evita que el cron y el botón "Ejecutar ahora" corran a la vez y dupliquen correos. */
  private ejecutando = false;

  constructor(
    @InjectModel(Factura.name) private readonly facturas: Model<Factura>,
    @InjectModel(HistorialEnvio.name) private readonly historial: Model<HistorialEnvio>,
    private readonly correo: CorreoService,
  ) {}

  get enEjecucion(): boolean {
    return this.ejecutando;
  }

  /**
   * Proceso de la prueba:
   * 1. Busca las facturas en primerrecordatorio o segundorecordatorio.
   * 2. Envía un correo por factura según su estado.
   * 3. Solo si el correo se envió, actualiza el estado (primer -> segundo, segundo -> desactivado).
   * Las facturas se leen una sola vez al inicio: una factura no avanza dos estados en la misma ejecución.
   */
  async ejecutar(origen: OrigenEjecucion): Promise<ResumenProceso> {
    const inicio = new Date();
    if (this.ejecutando) {
      return {
        ejecutado: false,
        motivo: 'Ya hay una ejecución en curso.',
        origen,
        inicio,
        fin: new Date(),
        procesadas: 0,
        enviadas: 0,
        fallidas: 0,
      };
    }

    this.ejecutando = true;
    let enviadas = 0;
    let fallidas = 0;
    let pendientes: FacturaConEmpresa[] = [];
    try {
      pendientes = await this.facturas
        .find({ estado: { $in: ESTADOS_A_PROCESAR } })
        .populate<{ empresa: Empresa | null }>('empresa')
        .sort({ numero: 1 })
        .lean<FacturaConEmpresa[]>();

      for (const f of pendientes) {
        (await this.procesarFactura(f, origen)) ? enviadas++ : fallidas++;
      }
    } finally {
      this.ejecutando = false;
    }

    const resumen: ResumenProceso = {
      ejecutado: true,
      origen,
      inicio,
      fin: new Date(),
      procesadas: pendientes.length,
      enviadas,
      fallidas,
    };
    this.logger.log(
      `Proceso ${origen}: ${resumen.procesadas} facturas, ${enviadas} enviadas, ${fallidas} fallidas.`,
    );
    return resumen;
  }

  /** Devuelve true si el correo se envió. */
  private async procesarFactura(f: FacturaConEmpresa, origen: OrigenEjecucion): Promise<boolean> {
    const estadoAnterior = f.estado;
    const estadoNuevo = TRANSICIONES[estadoAnterior]!;
    const base = {
      factura: f._id,
      numeroFactura: f.numero,
      empresa: f.empresa?.nombre ?? '(empresa no encontrada)',
      correoDestino: f.empresa?.correo ?? '',
      estadoAnterior,
      estadoNuevo,
      origen,
    };

    if (!f.empresa?.correo) {
      await this.historial.create({
        ...base,
        correoDestino: '(sin correo)',
        resultado: 'fallido',
        estadoActualizado: false,
        detalle: 'La factura no tiene una empresa con correo registrado.',
      });
      return false;
    }

    let idMensaje: string;
    try {
      idMensaje = await this.correo.enviarRecordatorio({
        destinatario: f.empresa.correo,
        empresa: f.empresa.nombre,
        contacto: f.empresa.contacto,
        numero: f.numero,
        concepto: f.concepto,
        valor: f.valor,
        fechaVencimiento: f.fechaVencimiento,
        estadoAnterior,
      });
    } catch (e) {
      // El correo no salió: el estado NO se cambia.
      await this.historial.create({
        ...base,
        resultado: 'fallido',
        estadoActualizado: false,
        detalle: `Error al enviar el correo: ${(e as Error).message}`,
      });
      return false;
    }

    // Solo se actualiza si la factura sigue en el estado leído (por si alguien la cambió mientras tanto).
    const r = await this.facturas.updateOne(
      { _id: f._id, estado: estadoAnterior },
      { $set: { estado: estadoNuevo, ultimoEnvio: new Date() } },
    );
    const estadoActualizado = r.modifiedCount === 1;
    await this.historial.create({
      ...base,
      resultado: 'enviado',
      estadoActualizado,
      idMensaje,
      detalle: estadoActualizado
        ? null
        : 'El correo se envió, pero la factura cambió de estado durante el proceso; no se actualizó.',
    });
    return true;
  }
}

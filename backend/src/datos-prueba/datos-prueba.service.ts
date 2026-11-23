import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import type { EstadoFactura } from '../comun/estados.js';
import { Empresa } from '../empresas/empresa.schema.js';
import { Factura } from '../facturas/factura.schema.js';

/** Datos ficticios: 3 firmas de abogados suscritas a Monolegal. Correos en dominio .test (no existen). */
const EMPRESAS: Empresa[] = [
  {
    nombre: 'Gómez & Asociados Abogados S.A.S.',
    nit: '900123456-1',
    correo: 'cartera@gomezasociados.test',
    contacto: 'Laura Gómez',
  },
  {
    nombre: 'Ruiz Martínez Consultores Jurídicos',
    nit: '901234567-2',
    correo: 'administracion@ruizmartinez.test',
    contacto: 'Andrés Ruiz',
  },
  {
    nombre: 'Bufete Herrera Legal S.A.S.',
    nit: '902345678-3',
    correo: 'pagos@herreralegal.test',
    contacto: 'Camila Herrera',
  },
];

interface FacturaSemilla {
  numero: string;
  nit: string;
  concepto: string;
  valor: number;
  emision: string;
  vencimiento: string;
  estado: EstadoFactura;
}

/** Estados mezclados a propósito: el proceso debe tocar solo primer y segundo recordatorio. */
const FACTURAS: FacturaSemilla[] = [
  { numero: 'FAC-1001', nit: '900123456-1', concepto: 'Plan Profesional · agosto 2026', valor: 89900, emision: '2026-08-01', vencimiento: '2026-08-15', estado: 'segundorecordatorio' },
  { numero: 'FAC-1002', nit: '900123456-1', concepto: 'Plan Profesional · septiembre 2026', valor: 89900, emision: '2026-09-01', vencimiento: '2026-09-15', estado: 'primerrecordatorio' },
  { numero: 'FAC-1003', nit: '900123456-1', concepto: 'Plan Profesional · octubre 2026', valor: 89900, emision: '2026-10-01', vencimiento: '2026-10-15', estado: 'pagada' },
  { numero: 'FAC-2001', nit: '901234567-2', concepto: 'Plan Empresarial · septiembre 2026', valor: 249900, emision: '2026-09-01', vencimiento: '2026-09-15', estado: 'primerrecordatorio' },
  { numero: 'FAC-2002', nit: '901234567-2', concepto: 'Plan Empresarial · octubre 2026', valor: 249900, emision: '2026-10-01', vencimiento: '2026-10-15', estado: 'pendiente' },
  { numero: 'FAC-2003', nit: '901234567-2', concepto: 'Usuarios adicionales (3)', valor: 59700, emision: '2026-08-20', vencimiento: '2026-09-05', estado: 'segundorecordatorio' },
  { numero: 'FAC-3001', nit: '902345678-3', concepto: 'Plan Básico · julio 2026', valor: 39900, emision: '2026-07-01', vencimiento: '2026-07-15', estado: 'desactivado' },
  { numero: 'FAC-3002', nit: '902345678-3', concepto: 'Plan Básico · septiembre 2026', valor: 39900, emision: '2026-09-01', vencimiento: '2026-09-15', estado: 'segundorecordatorio' },
  { numero: 'FAC-3003', nit: '902345678-3', concepto: 'Plan Básico · octubre 2026', valor: 39900, emision: '2026-10-01', vencimiento: '2026-10-15', estado: 'primerrecordatorio' },
];

@Injectable()
export class DatosPruebaService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DatosPruebaService.name);

  constructor(
    @InjectModel(Empresa.name) private readonly empresas: Model<Empresa>,
    @InjectModel(Factura.name) private readonly facturas: Model<Factura>,
  ) {}

  /** Primera vez (base vacía): carga los datos de prueba. */
  async onApplicationBootstrap(): Promise<void> {
    if ((await this.empresas.estimatedDocumentCount()) === 0) {
      await this.cargar();
      this.logger.log('Base vacía: se cargaron los datos de prueba.');
    }
  }

  /**
   * Crea o restablece las empresas y facturas de prueba a su estado inicial.
   * Es idempotente (busca por NIT y número de factura) y no borra el historial de envíos.
   */
  async cargar() {
    const idPorNit = new Map<string, unknown>();
    for (const e of EMPRESAS) {
      const doc = await this.empresas.findOneAndUpdate(
        { nit: e.nit },
        { $set: e },
        { upsert: true, new: true, runValidators: true },
      );
      idPorNit.set(e.nit, doc!._id);
    }

    await this.facturas.bulkWrite(
      FACTURAS.map((f) => ({
        updateOne: {
          filter: { numero: f.numero },
          update: {
            $set: {
              numero: f.numero,
              empresa: idPorNit.get(f.nit),
              concepto: f.concepto,
              valor: f.valor,
              fechaEmision: new Date(`${f.emision}T12:00:00-05:00`),
              fechaVencimiento: new Date(`${f.vencimiento}T12:00:00-05:00`),
              estado: f.estado,
              ultimoEnvio: null,
            },
          },
          upsert: true,
        },
      })),
    );

    return { empresas: EMPRESAS.length, facturas: FACTURAS.length };
  }
}

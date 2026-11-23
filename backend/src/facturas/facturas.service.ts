import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, type Model } from 'mongoose';
import { ESTADOS_FACTURA, type EstadoFactura } from '../comun/estados.js';
import { Empresa } from '../empresas/empresa.schema.js';
import { Factura } from './factura.schema.js';

export interface ResumenFacturas {
  total: number;
  valorTotal: number;
  porEstado: Record<EstadoFactura, { cantidad: number; valor: number }>;
  porEmpresa: { empresa: string; cantidad: number; valor: number }[];
}

@Injectable()
export class FacturasService {
  constructor(@InjectModel(Factura.name) private readonly facturas: Model<Factura>) {}

  /** Todas las facturas con los datos de su empresa, ordenadas por empresa y número. */
  async listar() {
    const lista = await this.facturas
      .find()
      .populate<{ empresa: Empresa }>('empresa', 'nombre nit correo contacto')
      .lean();
    return lista.sort(
      (a, b) =>
        (a.empresa?.nombre ?? '').localeCompare(b.empresa?.nombre ?? '', 'es') ||
        a.numero.localeCompare(b.numero, 'es'),
    );
  }

  /** Conteos y valores totales, calculados en la base de datos. */
  async resumen(): Promise<ResumenFacturas> {
    const [porEstadoBD, porEmpresaBD] = await Promise.all([
      this.facturas.aggregate<{ _id: EstadoFactura; cantidad: number; valor: number }>([
        { $group: { _id: '$estado', cantidad: { $sum: 1 }, valor: { $sum: '$valor' } } },
      ]),
      this.facturas.aggregate<{ empresa: string; cantidad: number; valor: number }>([
        { $group: { _id: '$empresa', cantidad: { $sum: 1 }, valor: { $sum: '$valor' } } },
        { $lookup: { from: 'empresas', localField: '_id', foreignField: '_id', as: 'e' } },
        {
          $project: {
            _id: 0,
            empresa: { $ifNull: [{ $first: '$e.nombre' }, '(sin empresa)'] },
            cantidad: 1,
            valor: 1,
          },
        },
        { $sort: { empresa: 1 } },
      ]),
    ]);

    const porEstado = Object.fromEntries(
      ESTADOS_FACTURA.map((e) => [e, { cantidad: 0, valor: 0 }]),
    ) as ResumenFacturas['porEstado'];
    for (const g of porEstadoBD) porEstado[g._id] = { cantidad: g.cantidad, valor: g.valor };

    return {
      total: porEstadoBD.reduce((s, g) => s + g.cantidad, 0),
      valorTotal: porEstadoBD.reduce((s, g) => s + g.valor, 0),
      porEstado,
      porEmpresa: porEmpresaBD,
    };
  }

  /** Cambio manual de estado (herramienta de pruebas). */
  async cambiarEstado(id: string, estado: EstadoFactura) {
    if (!isValidObjectId(id)) throw new NotFoundException('Factura no encontrada.');
    const f = await this.facturas
      .findByIdAndUpdate(id, { $set: { estado } }, { new: true, runValidators: true })
      .lean();
    if (!f) throw new NotFoundException('Factura no encontrada.');
    return f;
  }
}

import { Types } from 'mongoose';
import { RecordatoriosService } from './recordatorios.service.js';

/** Factura de prueba con su empresa ya "populada". */
function factura(numero: string, estado: string, correo: string | null = 'cliente@empresa.test') {
  return {
    _id: new Types.ObjectId(),
    numero,
    estado,
    concepto: 'Plan',
    valor: 1000,
    fechaVencimiento: new Date('2026-09-15'),
    empresa: correo === null ? null : { nombre: 'Empresa', correo, nit: '1' },
  };
}

function crearServicio(facturas: ReturnType<typeof factura>[], enviar: (d: any) => Promise<string>) {
  const consulta = {
    populate: () => consulta,
    sort: () => consulta,
    lean: async () => facturas,
  };
  const modeloFacturas = {
    find: vi.fn(() => consulta),
    updateOne: vi.fn(async () => ({ modifiedCount: 1 })),
  };
  const modeloHistorial = { create: vi.fn(async (d: unknown) => d) };
  const correo = { enviarRecordatorio: vi.fn(enviar) };
  const servicio = new RecordatoriosService(
    modeloFacturas as any,
    modeloHistorial as any,
    correo as any,
  );
  return { servicio, modeloFacturas, modeloHistorial, correo };
}

describe('RecordatoriosService', () => {
  it('solo consulta facturas en primer o segundo recordatorio', async () => {
    const { servicio, modeloFacturas } = crearServicio([], async () => 'id');
    await servicio.ejecutar('manual');
    expect(modeloFacturas.find).toHaveBeenCalledWith({
      estado: { $in: ['primerrecordatorio', 'segundorecordatorio'] },
    });
  });

  it('primerrecordatorio -> segundorecordatorio y segundorecordatorio -> desactivado tras enviar', async () => {
    const f1 = factura('F-1', 'primerrecordatorio');
    const f2 = factura('F-2', 'segundorecordatorio');
    const { servicio, modeloFacturas, correo } = crearServicio([f1, f2], async () => 'id');

    const r = await servicio.ejecutar('manual');

    expect(r).toMatchObject({ procesadas: 2, enviadas: 2, fallidas: 0 });
    expect(correo.enviarRecordatorio).toHaveBeenCalledTimes(2);
    expect(modeloFacturas.updateOne).toHaveBeenCalledWith(
      { _id: f1._id, estado: 'primerrecordatorio' },
      { $set: expect.objectContaining({ estado: 'segundorecordatorio' }) },
    );
    expect(modeloFacturas.updateOne).toHaveBeenCalledWith(
      { _id: f2._id, estado: 'segundorecordatorio' },
      { $set: expect.objectContaining({ estado: 'desactivado' }) },
    );
  });

  it('si el correo falla, NO cambia el estado y registra el fallo', async () => {
    const f = factura('F-1', 'primerrecordatorio');
    const { servicio, modeloFacturas, modeloHistorial } = crearServicio([f], async () => {
      throw new Error('SMTP caído');
    });

    const r = await servicio.ejecutar('manual');

    expect(r).toMatchObject({ procesadas: 1, enviadas: 0, fallidas: 1 });
    expect(modeloFacturas.updateOne).not.toHaveBeenCalled();
    expect(modeloHistorial.create).toHaveBeenCalledWith(
      expect.objectContaining({ resultado: 'fallido', estadoActualizado: false }),
    );
  });

  it('envía el correo antes de actualizar el estado', async () => {
    const orden: string[] = [];
    const f = factura('F-1', 'segundorecordatorio');
    const { servicio, modeloFacturas } = crearServicio([f], async () => {
      orden.push('correo');
      return 'id';
    });
    modeloFacturas.updateOne.mockImplementation(async () => {
      orden.push('actualizar');
      return { modifiedCount: 1 };
    });

    await servicio.ejecutar('manual');
    expect(orden).toEqual(['correo', 'actualizar']);
  });

  it('una factura sin correo no se envía ni se actualiza', async () => {
    const f = factura('F-1', 'primerrecordatorio', null);
    const { servicio, modeloFacturas, correo } = crearServicio([f], async () => 'id');

    const r = await servicio.ejecutar('manual');
    expect(r.fallidas).toBe(1);
    expect(correo.enviarRecordatorio).not.toHaveBeenCalled();
    expect(modeloFacturas.updateOne).not.toHaveBeenCalled();
  });

  it('no permite dos ejecuciones simultáneas', async () => {
    let liberar!: () => void;
    const f = factura('F-1', 'primerrecordatorio');
    const { servicio } = crearServicio(
      [f],
      () => new Promise<string>((res) => (liberar = () => res('id'))),
    );

    const primera = servicio.ejecutar('automatico');
    await new Promise((r) => setTimeout(r, 0));
    const segunda = await servicio.ejecutar('manual');
    expect(segunda.ejecutado).toBe(false);

    liberar();
    expect((await primera).enviadas).toBe(1);
  });
});

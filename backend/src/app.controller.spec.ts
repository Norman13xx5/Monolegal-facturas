import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller.js';
import { AppService, EstadoSalud } from './app.service.js';

describe('AppController', () => {
  let appController: AppController;
  const estado: EstadoSalud = { api: 'ok', mongo: 'ok', correo: 'ok' };

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [{ provide: AppService, useValue: { salud: async () => estado } }],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  it('GET /salud devuelve el estado del servicio', async () => {
    await expect(appController.salud()).resolves.toEqual(estado);
  });
});

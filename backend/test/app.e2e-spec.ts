import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';

// Requiere Mongo y SMTP disponibles (por ejemplo, con `docker compose up mongo mailpit`).
describe('Salud (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  it('/api/salud (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/salud')
      .expect(200)
      .expect((res) => expect(res.body.api).toBe('ok'));
  });

  afterEach(async () => {
    await app.close();
  });
});

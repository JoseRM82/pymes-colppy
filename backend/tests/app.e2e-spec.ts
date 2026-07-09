import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

async function createApp(): Promise<INestApplication<App>> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: false,
    }),
  );
  await app.init();
  return app;
}

describe('Ventas (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    app = await createApp();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /api/ventas/consolidado/mensual responde 200 con un array', () => {
    return request(app.getHttpServer())
      .get('/api/ventas/consolidado/mensual')
      .expect(200)
      .expect('Content-Type', /json/)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
      });
  });

  it('GET /api/ventas/meses/con-datos responde 200 con un array', () => {
    return request(app.getHttpServer())
      .get('/api/ventas/meses/con-datos')
      .expect(200)
      .expect('Content-Type', /json/)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
      });
  });
});

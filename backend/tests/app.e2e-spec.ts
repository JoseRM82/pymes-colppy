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

let idSeq = 0;

function uniqueId(): string {
  idSeq += 1;
  return `V-${Date.now()}${idSeq}`;
}

function validVenta(id_venta: string) {
  return {
    id_venta,
    fecha: '2026-05-02',
    cliente: 'Cliente E2E',
    producto: 'Producto test',
    cantidad: 1,
    moneda: '$',
    importe: 99.99,
    medio_pago: 'efectivo',
  };
}

describe('Ventas (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    app = await createApp();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('lecturas', () => {
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

  describe('altas', () => {
    it('POST /api/ventas crea una venta válida', async () => {
      const id = uniqueId();
      const payload = validVenta(id);

      const res = await request(app.getHttpServer())
        .post('/api/ventas')
        .send(payload)
        .expect(201);

      expect(res.body.id_venta).toBe(id);
      expect(res.body.importe).toBe(99.99);
    });

    it('POST /api/ventas responde 409 si el id ya existe', async () => {
      const id = uniqueId();
      const payload = validVenta(id);

      await request(app.getHttpServer()).post('/api/ventas').send(payload).expect(201);
      await request(app.getHttpServer()).post('/api/ventas').send(payload).expect(409);
    });

    it('POST /api/ventas responde 400 con payload inválido', () => {
      return request(app.getHttpServer())
        .post('/api/ventas')
        .send({
          id_venta: 'mal-formato',
          fecha: '2026-05-02',
          importe: 10,
        })
        .expect(400);
    });

    it('POST /api/ventas/lote separa insertadas y rechazadas', async () => {
      const idOk = uniqueId();
      const idOk2 = uniqueId();
      const idDup = uniqueId();

      await request(app.getHttpServer())
        .post('/api/ventas')
        .send(validVenta(idDup))
        .expect(201);

      const res = await request(app.getHttpServer())
        .post('/api/ventas/lote')
        .send({
          ventas: [validVenta(idOk), validVenta(idDup), validVenta(idOk2)],
        })
        .expect(201);

      expect(res.body.insertadas).toBe(2);
      expect(res.body.rechazadas).toHaveLength(1);
      expect(res.body.rechazadas[0].motivo).toBe('id_duplicado');
    });
  });

  describe('actualización', () => {
    it('PATCH /api/ventas/:id actualiza importe', async () => {
      const id = uniqueId();
      await request(app.getHttpServer())
        .post('/api/ventas')
        .send(validVenta(id))
        .expect(201);

      const res = await request(app.getHttpServer())
        .patch(`/api/ventas/${id}`)
        .send({ importe: 250.75 })
        .expect(200);

      expect(res.body.importe).toBe(250.75);
    });

    it('PATCH /api/ventas/:id responde 404 si no existe', () => {
      return request(app.getHttpServer())
        .patch('/api/ventas/V-00009999')
        .send({ importe: 10 })
        .expect(404);
    });
  });
});

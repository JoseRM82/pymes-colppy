import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { VentasService } from './ventas.service';
import { PrismaService } from '../prisma/prisma.service';

describe('VentasService', () => {
  let service: VentasService;

  const prisma = {
    venta: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    $queryRaw: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VentasService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(VentasService);
  });

  it('inserta una venta válida', async () => {
    prisma.venta.findUnique.mockResolvedValue(null);
    prisma.venta.create.mockResolvedValue({
      idVenta: 'V-1001',
      fecha: new Date('2026-05-02T12:00:00.000Z'),
      cliente: 'Cliente',
      producto: 'Prod',
      cantidad: 1,
      moneda: '$',
      importe: 100,
      medioPago: 'efectivo',
      createdAt: new Date(),
    });

    const result = await service.createOne({
      id_venta: 'V-1001',
      fecha: '2026-05-02',
      cliente: 'Cliente',
      producto: 'Prod',
      cantidad: 1,
      moneda: '$',
      importe: 100,
      medio_pago: 'efectivo',
    });

    expect(result.id_venta).toBe('V-1001');
  });

  it('rechaza duplicado en alta individual', async () => {
    prisma.venta.findUnique.mockResolvedValue({
      idVenta: 'V-1001',
      fecha: new Date('2026-05-02T12:00:00.000Z'),
      cliente: 'Cliente',
      producto: 'Prod',
      cantidad: 1,
      moneda: '$',
      importe: 100,
      medioPago: 'efectivo',
      createdAt: new Date(),
    });

    await expect(
      service.createOne({
        id_venta: 'V-1001',
        fecha: '2026-05-02',
        cliente: 'Otro',
        producto: 'Prod',
        cantidad: 1,
        importe: 50,
        medio_pago: 'efectivo',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('consolida mensualmente', async () => {
    prisma.venta.findMany.mockResolvedValue([
      { fecha: new Date('2026-05-15T12:00:00.000Z'), importe: 1000 },
      { fecha: new Date('2026-06-10T12:00:00.000Z'), importe: 2000 },
      { fecha: new Date('2026-06-20T12:00:00.000Z'), importe: 500 },
    ]);

    const result = await service.consolidadoMensual();
    expect(result).toEqual([
      { mes: '2026-05', total: 1000 },
      { mes: '2026-06', total: 2500 },
    ]);
  });
});

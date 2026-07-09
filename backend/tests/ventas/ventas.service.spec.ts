import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { VentasService } from '../../src/ventas/ventas.service';
import { PrismaService } from '../../src/prisma/prisma.service';

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

  const validDto = {
    id_venta: 'V-1001',
    fecha: '2026-05-02',
    cliente: 'Cliente',
    producto: 'Prod',
    cantidad: 1,
    moneda: '$',
    importe: 100,
    medio_pago: 'efectivo',
  };

  const prismaVenta = {
    idVenta: 'V-1001',
    fecha: new Date('2026-05-02T12:00:00.000Z'),
    cliente: 'Cliente',
    producto: 'Prod',
    cantidad: 1,
    moneda: '$',
    importe: 100,
    medioPago: 'efectivo',
    createdAt: new Date(),
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

  describe('createOne', () => {
    it('inserta una venta válida', async () => {
      prisma.venta.findUnique.mockResolvedValue(null);
      prisma.venta.create.mockResolvedValue(prismaVenta);

      const result = await service.createOne(validDto);
      expect(result.id_venta).toBe('V-1001');
      expect(prisma.venta.create).toHaveBeenCalledTimes(1);
    });

    it('rechaza duplicado en alta individual', async () => {
      prisma.venta.findUnique.mockResolvedValue(prismaVenta);

      await expect(
        service.createOne({
          ...validDto,
          cliente: 'Otro',
          importe: 50,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.venta.create).not.toHaveBeenCalled();
    });
  });

  describe('createLote', () => {
    it('inserta válidas y rechaza inválidas o duplicadas', async () => {
      prisma.venta.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(prismaVenta);
      prisma.venta.create.mockResolvedValue(prismaVenta);

      const result = await service.createLote([
        validDto,
        { ...validDto, id_venta: 'V-1001' },
        {
          ...validDto,
          id_venta: 'V-1002',
          importe: -1,
        },
      ]);

      expect(result.insertadas).toBe(1);
      expect(result.rechazadas).toHaveLength(2);
      expect(result.rechazadas[0].motivo).toBe('id_duplicado');
      expect(result.rechazadas[1].motivo).toBe('validacion_fallida');
    });
  });

  describe('update', () => {
    it('actualiza una venta existente', async () => {
      prisma.venta.findUnique.mockResolvedValue(prismaVenta);
      prisma.venta.update.mockResolvedValue({
        ...prismaVenta,
        importe: 200,
      });

      const result = await service.update('V-1001', { importe: 200 });
      expect(result.importe).toBe(200);
      expect(prisma.venta.update).toHaveBeenCalledTimes(1);
    });

    it('lanza NotFoundException si no existe', async () => {
      prisma.venta.findUnique.mockResolvedValue(null);

      await expect(
        service.update('V-9999', { importe: 200 }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('consolidadoMensual', () => {
    it('agrupa totales por mes', async () => {
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
});

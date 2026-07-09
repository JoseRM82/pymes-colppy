import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVentaDto } from './dto/create-venta.dto';
import { UpdateVentaDto } from './dto/update-venta.dto';
import {
  mapVenta,
  monthRange,
  parseFecha,
  VentaResponse,
} from './ventas.mapper';

export type RechazoMotivo = 'id_duplicado' | 'validacion_fallida';

export interface VentaRechazada extends VentaResponse {
  motivo: RechazoMotivo;
}

@Injectable()
export class VentasService {
  constructor(private readonly prisma: PrismaService) {}

  async createOne(dto: CreateVentaDto): Promise<VentaResponse> {
    const existing = await this.prisma.venta.findUnique({
      where: { idVenta: dto.id_venta },
    });
    if (existing) {
      throw new ConflictException({
        message: 'El id de venta ya existe',
        venta: mapVenta(existing),
      });
    }
    const venta = await this.prisma.venta.create({
      data: this.toCreateData(dto),
    });
    return mapVenta(venta);
  }

  async createLote(ventas: CreateVentaDto[]): Promise<{
    insertadas: number;
    rechazadas: VentaRechazada[];
  }> {
    let insertadas = 0;
    const rechazadas: VentaRechazada[] = [];

    for (const raw of ventas) {
      const dto = plainToInstance(CreateVentaDto, raw);
      const errors = validateSync(dto, {
        whitelist: true,
        forbidNonWhitelisted: false,
      });
      if (errors.length > 0) {
        rechazadas.push({
          ...this.fallbackFromRaw(raw),
          motivo: 'validacion_fallida',
        });
        continue;
      }

      const existing = await this.prisma.venta.findUnique({
        where: { idVenta: dto.id_venta },
      });
      if (existing) {
        rechazadas.push({
          ...this.partialFromDto(dto),
          motivo: 'id_duplicado',
        });
        continue;
      }

      try {
        await this.prisma.venta.create({ data: this.toCreateData(dto) });
        insertadas += 1;
      } catch {
        rechazadas.push({
          ...this.partialFromDto(dto),
          motivo: 'validacion_fallida',
        });
      }
    }

    return { insertadas, rechazadas };
  }

  async update(idVenta: string, dto: UpdateVentaDto): Promise<VentaResponse> {
    const existing = await this.prisma.venta.findUnique({
      where: { idVenta },
    });
    if (!existing) {
      throw new NotFoundException('Venta no encontrada');
    }

    const venta = await this.prisma.venta.update({
      where: { idVenta },
      data: {
        ...(dto.fecha !== undefined && { fecha: parseFecha(dto.fecha) }),
        ...(dto.cliente !== undefined && { cliente: dto.cliente }),
        ...(dto.producto !== undefined && { producto: dto.producto }),
        ...(dto.cantidad !== undefined && { cantidad: dto.cantidad }),
        ...(dto.moneda !== undefined && { moneda: dto.moneda || '$' }),
        ...(dto.importe !== undefined && { importe: dto.importe }),
        ...(dto.medio_pago !== undefined && { medioPago: dto.medio_pago }),
      },
    });
    return mapVenta(venta);
  }

  async consolidadoMensual(): Promise<{ mes: string; total: number }[]> {
    const ventas = await this.prisma.venta.findMany({
      select: { fecha: true, importe: true },
    });
    const totals = new Map<string, number>();
    for (const v of ventas) {
      const mes = v.fecha.toISOString().slice(0, 7);
      totals.set(mes, (totals.get(mes) ?? 0) + Number(v.importe));
    }
    return [...totals.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mes, total]) => ({ mes, total }));
  }

  async consolidadoAnual(): Promise<{ anio: string; total: number }[]> {
    const ventas = await this.prisma.venta.findMany({
      select: { fecha: true, importe: true },
    });
    const totals = new Map<string, number>();
    for (const v of ventas) {
      const anio = v.fecha.toISOString().slice(0, 4);
      totals.set(anio, (totals.get(anio) ?? 0) + Number(v.importe));
    }
    return [...totals.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([anio, total]) => ({ anio, total }));
  }

  async mesesConDatos(): Promise<string[]> {
    const ventas = await this.prisma.venta.findMany({
      select: { fecha: true },
    });
    const meses = new Set(
      ventas.map((v) => v.fecha.toISOString().slice(0, 7)),
    );
    return [...meses].sort();
  }

  async porMes(yyyyMm: string): Promise<VentaResponse[]> {
    const { start, end } = monthRange(yyyyMm);
    const ventas = await this.prisma.venta.findMany({
      where: { fecha: { gte: start, lt: end } },
      orderBy: { fecha: 'asc' },
    });
    return ventas.map(mapVenta);
  }

  async consolidadoCliente(
    cliente: string,
  ): Promise<{ mes: string; total: number }[]> {
    const ventas = await this.prisma.venta.findMany({
      where: { cliente },
      select: { fecha: true, importe: true },
    });
    const totals = new Map<string, number>();
    for (const v of ventas) {
      const mes = v.fecha.toISOString().slice(0, 7);
      totals.set(mes, (totals.get(mes) ?? 0) + Number(v.importe));
    }
    return [...totals.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mes, total]) => ({ mes, total }));
  }

  async totalCliente(cliente: string): Promise<{ total: number }> {
    const result = await this.prisma.venta.aggregate({
      where: { cliente },
      _sum: { importe: true },
    });
    return { total: Number(result._sum.importe ?? 0) };
  }

  async ventasCliente(
    cliente: string,
    page: number,
    limit: number,
  ): Promise<{
    data: VentaResponse[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;
    const [ventas, total] = await Promise.all([
      this.prisma.venta.findMany({
        where: { cliente },
        orderBy: { fecha: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.venta.count({ where: { cliente } }),
    ]);
    return {
      data: ventas.map(mapVenta),
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  private toCreateData(dto: CreateVentaDto) {
    return {
      idVenta: dto.id_venta,
      fecha: parseFecha(dto.fecha),
      cliente: dto.cliente,
      producto: dto.producto,
      cantidad: dto.cantidad,
      moneda: dto.moneda?.trim() || '$',
      importe: dto.importe,
      medioPago: dto.medio_pago,
    };
  }

  private partialFromDto(dto: CreateVentaDto): VentaResponse {
    return {
      id_venta: dto.id_venta,
      fecha: dto.fecha,
      cliente: dto.cliente,
      producto: dto.producto,
      cantidad: dto.cantidad,
      moneda: dto.moneda?.trim() || '$',
      importe: dto.importe,
      medio_pago: dto.medio_pago,
    };
  }

  private fallbackFromRaw(raw: CreateVentaDto): VentaResponse {
    return {
      id_venta: String(raw.id_venta ?? ''),
      fecha: String(raw.fecha ?? ''),
      cliente: String(raw.cliente ?? ''),
      producto: String(raw.producto ?? ''),
      cantidad: Number(raw.cantidad ?? 0),
      moneda: raw.moneda ? String(raw.moneda) : '$',
      importe: Number(raw.importe ?? 0),
      medio_pago: String(raw.medio_pago ?? ''),
    };
  }
}

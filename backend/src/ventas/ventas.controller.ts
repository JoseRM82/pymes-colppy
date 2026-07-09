import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CreateVentaDto } from './dto/create-venta.dto';
import { LoteVentasDto } from './dto/lote-ventas.dto';
import { UpdateVentaDto } from './dto/update-venta.dto';
import { VentasService } from './ventas.service';

@Controller('ventas')
export class VentasController {
  constructor(private readonly ventasService: VentasService) {}

  @Post()
  createOne(@Body() dto: CreateVentaDto) {
    return this.ventasService.createOne(dto);
  }

  @Post('lote')
  createLote(@Body() dto: LoteVentasDto) {
    return this.ventasService.createLote(dto.ventas);
  }

  @Patch(':id_venta')
  update(
    @Param('id_venta') idVenta: string,
    @Body() dto: UpdateVentaDto,
  ) {
    return this.ventasService.update(idVenta, dto);
  }

  @Get('consolidado/mensual')
  consolidadoMensual() {
    return this.ventasService.consolidadoMensual();
  }

  @Get('consolidado/anual')
  consolidadoAnual() {
    return this.ventasService.consolidadoAnual();
  }

  @Get('meses/con-datos')
  mesesConDatos() {
    return this.ventasService.mesesConDatos();
  }

  @Get('por-mes/:yyyyMm')
  porMes(@Param('yyyyMm') yyyyMm: string) {
    return this.ventasService.porMes(yyyyMm);
  }

  @Get('cliente/:cliente/consolidado')
  consolidadoCliente(@Param('cliente') cliente: string) {
    return this.ventasService.consolidadoCliente(decodeURIComponent(cliente));
  }

  @Get('cliente/:cliente/total')
  totalCliente(@Param('cliente') cliente: string) {
    return this.ventasService.totalCliente(decodeURIComponent(cliente));
  }

  @Get('cliente/:cliente')
  ventasCliente(
    @Param('cliente') cliente: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.ventasService.ventasCliente(
      decodeURIComponent(cliente),
      Math.max(1, parseInt(page, 10) || 1),
      Math.min(100, Math.max(1, parseInt(limit, 10) || 20)),
    );
  }
}

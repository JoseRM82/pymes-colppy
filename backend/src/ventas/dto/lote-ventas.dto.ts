import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { CreateVentaDto } from './create-venta.dto';

export class LoteVentasDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateVentaDto)
  ventas!: CreateVentaDto[];
}

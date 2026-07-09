import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { MaxDateToday } from '../validators/max-date-today.validator';

export class UpdateVentaDto {
  @IsOptional()
  @IsDateString({}, { message: 'fecha debe ser YYYY-MM-DD' })
  @MaxDateToday()
  fecha?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  cliente?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  producto?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  cantidad?: number;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  @Transform(({ value }) =>
    value === undefined || value === null || value === ''
      ? undefined
      : String(value).trim(),
  )
  moneda?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  importe?: number;

  @IsOptional()
  @IsIn(['efectivo', 'tarjeta', 'transferencia'])
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  medio_pago?: string;
}

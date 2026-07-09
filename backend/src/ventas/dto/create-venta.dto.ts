import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { MaxDateToday } from '../validators/max-date-today.validator';

export class CreateVentaDto {
  @IsString()
  @Matches(/^V-\d{4,}$/, {
    message: 'id_venta debe tener formato V-XXXX',
  })
  @MaxLength(20)
  id_venta!: string;

  @IsDateString({}, { message: 'fecha debe ser YYYY-MM-DD' })
  @MaxDateToday()
  fecha!: string;

  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  cliente!: string;

  @IsString()
  @MaxLength(200)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  producto!: string;

  @IsInt()
  @Min(1)
  cantidad!: number;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return '$';
    return String(value).trim();
  })
  moneda?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  importe!: number;

  @IsIn(['efectivo', 'tarjeta', 'transferencia'])
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  medio_pago!: string;
}

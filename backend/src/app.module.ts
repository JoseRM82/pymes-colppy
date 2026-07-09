import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { VentasModule } from './ventas/ventas.module';

@Module({
  imports: [PrismaModule, VentasModule],
})
export class AppModule {}

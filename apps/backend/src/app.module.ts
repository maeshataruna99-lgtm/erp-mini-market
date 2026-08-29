import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UnitModule } from './modules/master/unit/unit.module';
import { SupplierModule } from './modules/master/supplier/supplier.module';
import { ProductModule } from './modules/master/product/product.module';
import { AuditModule } from './modules/audit/audit.module';
import { PoModule } from './modules/transaction/po/po.module';
import { ReceivingModule } from './modules/transaction/receiving/receiving.module';
import { OpnameModule } from './modules/transaction/opname/opname.module';
import { MutationModule } from './modules/transaction/mutation/mutation.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: (config.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m') as unknown as number,
        },
      }),
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    UnitModule,
    SupplierModule,
    ProductModule,
    AuditModule,
    PoModule,
    ReceivingModule,
    OpnameModule,
    MutationModule,
    DashboardModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}

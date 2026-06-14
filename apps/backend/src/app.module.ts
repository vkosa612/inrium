import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, Reflector } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { envValidationSchema } from './config/env.validation';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from './modules/auth/guards/roles.guard';
import { ContentModule } from './modules/content/content.module';
import { SystemsModule } from './modules/systems/systems.module';
import { KitsModule } from './modules/kits/kits.module';
import { HomeModule } from './modules/home/home.module';
import { HealthModule } from './modules/health/health.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
      validationSchema: envValidationSchema,
      validationOptions: { allowUnknown: true, abortEarly: false },
    }),

    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: config.get<number>('THROTTLE_TTL', 60000),
            limit: config.get<number>('THROTTLE_LIMIT', 100),
          },
        ],
      }),
    }),

    PrismaModule,
    AuthModule,
    ContentModule,
    SystemsModule,
    KitsModule,
    HomeModule,
    HealthModule,
  ],

  providers: [
    // 1. Global exception filter
    { provide: APP_FILTER, useClass: AllExceptionsFilter },

    // 2. Global response interceptor
    {
      provide: APP_INTERCEPTOR,
      useFactory: (reflector: Reflector) => new ResponseInterceptor(reflector),
      inject: [Reflector],
    },

    // 3. Rate-limit guard (runs first)
    { provide: APP_GUARD, useClass: ThrottlerGuard },

    // 4. JWT auth guard (checks @Public() to skip)
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },

    // 5. Roles guard (runs after JwtAuthGuard sets request.user)
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}

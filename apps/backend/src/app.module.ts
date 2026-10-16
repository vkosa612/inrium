import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, Reflector } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { envValidationSchema } from './config/env.validation';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { CsrfGuard } from './common/security/csrf.guard';
import { SecurityModule } from './common/security/security.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from './modules/auth/guards/roles.guard';
import { BookmarksModule } from './modules/bookmarks/bookmarks.module';
import { CommunitiesModule } from './modules/communities/communities.module';
import { AdminModule } from './modules/admin/admin.module';
import { ContentModule } from './modules/content/content.module';
import { GamesModule } from './modules/games/games.module';
import { HealthModule } from './modules/health/health.module';
import { HelpModule } from './modules/help/help.module';
import { HomeBlocksModule } from './modules/home-blocks/home-blocks.module';
import { HomeModule } from './modules/home/home.module';
import { EmailModule } from './modules/email/email.module';
import { KitsModule } from './modules/kits/kits.module';
import { SystemsModule } from './modules/systems/systems.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { UsersModule } from './modules/users/users.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Тести не повинні читати локальний .env (там можуть бути dev/prod значення).
      ignoreEnvFile: process.env.NODE_ENV === 'test',
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

    SecurityModule,
    PrismaModule,
    EmailModule,
    AuthModule,
    ContentModule,
    SystemsModule,
    KitsModule,
    HomeModule,
    HelpModule,
    HealthModule,
    UploadsModule,
    UsersModule,
    BookmarksModule,
    GamesModule,
    HomeBlocksModule,
    CommunitiesModule,
    AdminModule,
  ],

  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    {
      provide: APP_INTERCEPTOR,
      useFactory: (reflector: Reflector) => new ResponseInterceptor(reflector),
      inject: [Reflector],
    },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: CsrfGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}

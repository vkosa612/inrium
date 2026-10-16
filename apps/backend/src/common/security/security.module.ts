import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { CaptchaService } from './captcha.service';
import { CsrfGuard } from './csrf.guard';
import { CsrfService } from './csrf.service';
import { RateLimitService } from './rate-limit.service';
import { SecurityConfigService } from './security-config.service';

@Global()
@Module({
  imports: [JwtModule.register({})],
  providers: [SecurityConfigService, CsrfService, CsrfGuard, RateLimitService, CaptchaService],
  exports: [SecurityConfigService, CsrfService, CsrfGuard, RateLimitService, CaptchaService],
})
export class SecurityModule {}

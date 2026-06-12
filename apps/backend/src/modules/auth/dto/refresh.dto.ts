import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RefreshDto {
  @ApiPropertyOptional({
    description: 'Refresh token (can also be sent via refresh_token httpOnly cookie)',
  })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}

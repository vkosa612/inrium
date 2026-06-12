import { Injectable } from '@nestjs/common';
import { HealthResponse } from '@inrium/shared';

@Injectable()
export class HealthService {
  getHealth(): HealthResponse {
    return {
      status: 'ok',
      service: 'inrium-backend',
      timestamp: new Date().toISOString(),
    };
  }
}

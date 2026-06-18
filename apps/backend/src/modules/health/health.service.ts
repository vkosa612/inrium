import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async getHealth() {
    let dbStatus: 'ok' | 'error' = 'ok';
    let dbLatencyMs: number | null = null;

    try {
      const start = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      dbLatencyMs = Date.now() - start;
    } catch {
      dbStatus = 'error';
    }

    return {
      status: dbStatus === 'ok' ? 'ok' : 'degraded',
      service: 'inrium-backend',
      timestamp: new Date().toISOString(),
      db: { status: dbStatus, latencyMs: dbLatencyMs },
    };
  }
}

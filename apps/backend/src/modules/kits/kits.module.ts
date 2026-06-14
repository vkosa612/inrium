import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { KitsController } from './kits.controller';
import { KitsService } from './kits.service';

@Module({
  imports: [PrismaModule],
  controllers: [KitsController],
  providers: [KitsService],
})
export class KitsModule {}

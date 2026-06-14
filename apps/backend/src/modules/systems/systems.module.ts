import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { SystemsController } from './systems.controller';
import { SystemsService } from './systems.service';

@Module({
  imports: [PrismaModule],
  controllers: [SystemsController],
  providers: [SystemsService],
})
export class SystemsModule {}

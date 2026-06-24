import { Module } from '@nestjs/common';
import { UploadsModule } from '../uploads/uploads.module';
import { GamesController } from './games.controller';
import { GamesService } from './games.service';

@Module({
  imports: [UploadsModule],
  controllers: [GamesController],
  providers: [GamesService],
  exports: [GamesService],
})
export class GamesModule {}

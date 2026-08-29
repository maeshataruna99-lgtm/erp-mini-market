import { Module } from '@nestjs/common';
import { MutationService } from './mutation.service';
import { MutationController } from './mutation.controller';

@Module({
  controllers: [MutationController],
  providers: [MutationService],
})
export class MutationModule {}

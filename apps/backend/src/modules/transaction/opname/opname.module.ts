import { Module } from '@nestjs/common';
import { OpnameService } from './opname.service';
import { OpnameController } from './opname.controller';

@Module({
  controllers: [OpnameController],
  providers: [OpnameService],
})
export class OpnameModule {}

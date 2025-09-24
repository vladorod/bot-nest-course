import { Module } from '@nestjs/common';
import { ProgramsService } from './programs.service';

@Module({
  providers: [ProgramsService]
})
export class ProgramsModule {}

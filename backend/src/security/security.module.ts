import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SecurityService } from './security.service';
import { SecurityController } from './security.controller';
import { AnswerAttempt } from './entities/answer-attempt.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([AnswerAttempt]),
  ],
  controllers: [SecurityController],
  providers: [SecurityService],
  exports: [SecurityService],
})
export class SecurityModule {}

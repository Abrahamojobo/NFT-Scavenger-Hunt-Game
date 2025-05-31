import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, LessThan } from 'typeorm';
import { AnswerAttempt } from './entities/answer-attempt.entity';
import { User } from '../users/users.entity';
import { Puzzles } from '../puzzles/puzzles.entity';

@Injectable()
export class SecurityService {
  // Configuration constants
  private readonly MAX_ATTEMPTS_PER_MINUTE = 5;
  private readonly MAX_WRONG_ANSWERS_PER_HOUR = 15;
  private readonly BLOCK_DURATION_MINUTES = 30;

  constructor(
    @InjectRepository(AnswerAttempt)
    private readonly attemptRepository: Repository<AnswerAttempt>,
  ) {}

  async recordAttempt(user: User, puzzle: Puzzles, isCorrect: boolean): Promise<boolean> {
    const attempt = this.attemptRepository.create({
      user,
      puzzle,
      isCorrect,
    });

    await this.attemptRepository.save(attempt);

    // Check for suspicious activity
    const isBlocked = await this.checkAndBlockIfSuspicious(user.id, puzzle.id);
    return !isBlocked;
  }

  private async checkAndBlockIfSuspicious(userId: number, puzzleId: number): Promise<boolean> {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Check if user is currently blocked
    const existingBlock = await this.attemptRepository.findOne({
      where: {
        user: { id: userId },
        blockExpiresAt: MoreThan(now),
      },
    });

    if (existingBlock) {
      return true;
    }

    // Count recent attempts
    const recentAttempts = await this.attemptRepository.count({
      where: {
        user: { id: userId },
        puzzle: { id: puzzleId },
        attemptTime: MoreThan(oneMinuteAgo),
      },
    });

    // Count wrong answers in the last hour
    const wrongAnswers = await this.attemptRepository.count({
      where: {
        user: { id: userId },
        isCorrect: false,
        attemptTime: MoreThan(oneHourAgo),
      },
    });

    const isSuspicious = recentAttempts > this.MAX_ATTEMPTS_PER_MINUTE || 
                        wrongAnswers > this.MAX_WRONG_ANSWERS_PER_HOUR;

    if (isSuspicious) {
      const blockExpiresAt = new Date(now.getTime() + this.BLOCK_DURATION_MINUTES * 60 * 1000);
      
      // Update all recent attempts as suspicious and set block expiration
      await this.attemptRepository.update(
        {
          user: { id: userId },
          attemptTime: MoreThan(oneHourAgo),
        },
        {
          flaggedAsSuspicious: true,
          blockExpiresAt,
        }
      );

      return true;
    }

    return false;
  }

  async isUserBlocked(userId: number): Promise<boolean> {
    const now = new Date();
    const block = await this.attemptRepository.findOne({
      where: {
        user: { id: userId },
        blockExpiresAt: MoreThan(now),
      },
    });

    return !!block;
  }

  async getBlockExpiration(userId: number): Promise<Date | null> {
    const now = new Date();
    const block = await this.attemptRepository.findOne({
      where: {
        user: { id: userId },
        blockExpiresAt: MoreThan(now),
      },
    });

    return block?.blockExpiresAt || null;
  }

  async getSuspiciousAttempts(page = 1, limit = 10) {
    const [attempts, total] = await this.attemptRepository.findAndCount({
      where: { flaggedAsSuspicious: true },
      relations: ['user', 'puzzle'],
      skip: (page - 1) * limit,
      take: limit,
      order: { attemptTime: 'DESC' },
    });

    return {
      data: attempts,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }
}

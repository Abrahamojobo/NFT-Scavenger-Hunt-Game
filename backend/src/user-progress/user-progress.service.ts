import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserProgress } from './user-progress.entity';
import { UserProgressDto } from './dto/user-progress.dto';
import { LevelProgressService } from './level-progress.service';
import { UsersService } from 'src/users/users.service';
import { PuzzlesService } from 'src/puzzles/puzzles.service';
import { HintsService } from 'src/hints/hints.service';
import { Puzzles } from 'src/puzzles/puzzles.entity';
import { Level } from 'src/level/entities/level.entity';
import { LevelService } from 'src/level/level.service';
import type { Hints } from '../hints/hints.entity';

@Injectable()
export class UserProgressService {
  /**
   * Returns the user's progress for a specific level (percentage, solved, total)
   */
  async getLevelProgress(userId: number, levelId: string): Promise<{ progress: number; solved: number; total: number }> {
    if (this.levelProgressService && this.levelProgressService.calculateLevelCompletion) {
      return this.levelProgressService.calculateLevelCompletion(userId, levelId);
    }
    // Ensure levelId is a number
    const numericLevelId = typeof levelId === 'string' ? parseInt(levelId, 10) : levelId;
    // Count total puzzles in the level
    const totalPuzzles = await this.puzzlesService.getTotalPuzzlesInLevel(numericLevelId);
    // Count solved puzzles by user in the level
    const solvedPuzzles = await this.userProgressRepository.count({
      where: {
        user: { id: userId },
        puzzles: { level: { id: numericLevelId } },
        completed: true,
      },
    });
    const progress = totalPuzzles > 0 ? (solvedPuzzles / totalPuzzles) * 100 : 0;
    return {
      progress: parseFloat(progress.toFixed(2)),
      solved: solvedPuzzles,
      total: totalPuzzles,
    };
  }
  /**
   * Check if a user has completed a given puzzle
   */
  async isPuzzleCompleted(userId: number, puzzleId: number): Promise<boolean> {
    const progress = await this.userProgressRepository.findOne({
      where: { user: { id: userId }, puzzles: { id: puzzleId }, completed: true },
    });
    return !!progress;
  }
  constructor(
    @InjectRepository(UserProgress)
    private readonly userProgressRepository: Repository<UserProgress>,
    @InjectRepository(Level)
    private readonly levelRepository: Repository<Level>,
    private readonly usersService: UsersService,
    private readonly puzzlesService: PuzzlesService,
    private readonly hintsService: HintsService,
    private readonly levelProgressService: LevelProgressService,
    private readonly levelService: LevelService,
  ) {}

  async getSolvedPuzzlesInLevel(userId: number, levelId: number): Promise<{ puzzles: Puzzles[], count: number }> {
    // Delegate to LevelProgressService if available
    if (this.levelProgressService && this.levelProgressService.getPuzzlesSolvedPerLevel) {
      return this.levelProgressService.getPuzzlesSolvedPerLevel(userId, levelId.toString());
    }

    // Otherwise, implement the logic here:
    const userProgressEntries = await this.userProgressRepository.find({
      where: {
        user: { id: userId },
        puzzles: { level: { id: levelId } },
        completed: true,
      },
      relations: ['puzzles', 'puzzles.level', 'puzzles.hints', 'puzzles.answers'],
    });

    const solvedPuzzles = userProgressEntries.map(progress => progress.puzzles);
    return {
      puzzles: solvedPuzzles,
      count: solvedPuzzles.length,
    };
  }

  async getGameCompletionRate(userId: number, gameId: string): Promise<{ completionRate: number }> {
    // Here gameId is assumed to be a levelId
    if (!userId || !gameId) {
      throw new BadRequestException('Missing userId or gameId');
    }
    // Use LevelProgressService to get progress
    if (!this.levelProgressService) {
      throw new NotFoundException('LevelProgressService not available');
    }
    const stats = await this.levelProgressService.calculateLevelCompletion(userId, gameId);
    return { completionRate: stats.progress };
  }

  async getUserProgress(userId: number): Promise<UserProgress[]> {
    const progress = await this.userProgressRepository.find({
      where: { user: { id: userId } },
      relations: ['puzzles', 'hints'],
    });

    if (!progress.length) {
      throw new NotFoundException(`No progress found for user ${userId}`);
    }

    return progress;
  }

  async updateProgress(
    userId: number,
    puzzleId: number,
    hintId: number | null,
    completed: boolean,
  ): Promise<UserProgress> {
    let progress = await this.userProgressRepository.findOne({
      where: { user: { id: userId }, puzzles: { id: puzzleId } },
    });

    if (!progress) {
      progress = this.userProgressRepository.create({
        user: { id: userId },
        puzzles: { id: puzzleId },
      });
    }

    progress.completed = completed;
    progress.lastUpdated = new Date();

    // Optionally handle hint logic here if needed
    if (hintId) {
      // Add hint handling logic if your entity supports it
      // progress.hints = { id: hintId } as Hints; // Uncomment if needed
      // progress.hintsUsed = (progress.hintsUsed || 0) + 1;
    }

    return this.userProgressRepository.save(progress);
  }

  private async handleLevelCompletion(
    userId: number,
    levelId: string,
  ): Promise<void> {
    // This method template is incomplete and references undefined variables. Please implement logic as needed.
    // Example: mark a level as completed for a user, update progress, etc.
    // Remove or implement this method to avoid errors.
    return;
  }


  async puzzleCompleted(
    userId: number,
    puzzleId: number,
  ): Promise<UserProgress> {

    const progress = await this.updateProgress(userId, puzzleId, null, true);
    
    await this.recalcOverallProgress(progress);
    return this.userProgressRepository.save(progress);
  }

  async levelCompleted(userId: number, levelId: number): Promise<UserProgress> {
  
    let progress = await this.userProgressRepository.findOne({
      where: { user: { id: userId } },
    });
    if (!progress) {
      progress = this.userProgressRepository.create({ user: { id: userId } });
    }
    if (!progress.completedLevels) {
      progress.completedLevels = [];
    }
    if (!progress.completedLevels.includes(levelId)) {
      progress.completedLevels.push(levelId);
    }

    await this.recalcOverallProgress(progress);
    progress.lastUpdated = new Date();
    return this.userProgressRepository.save(progress);
  }

  private async recalcOverallProgress(progress: UserProgress): Promise<void> {
    const totalPuzzles = await this.puzzlesService.getTotalPuzzles();
    const totalLevels = await this.levelService.getTotalLevels();

    const puzzleProgress = progress.completed ? 100 : 0;

    const levelProgress =
      totalLevels && progress.completedLevels
        ? (progress.completedLevels.length / totalLevels) * 100
        : 0;

    progress.progressPercentage = Math.round(
      (puzzleProgress + levelProgress) / 2
    );
  }

  async getUserScore(userId: number): Promise<number> {
    // Fetch all completed progress records for the user
    const progress = await this.userProgressRepository.find({
      where: { user: { id: userId }, completed: true },
      relations: ['puzzles'],
    });
    // Sum up the pointValue for each completed puzzle
    return progress.reduce((total, p) => total + (p.puzzles?.pointValue || 0), 0);
  }
}

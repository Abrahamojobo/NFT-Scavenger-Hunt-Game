import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { User } from '../../users/users.entity';
import { Puzzles } from '../../puzzles/puzzles.entity';

@Entity()
export class AnswerAttempt {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User)
  user: User;

  @ManyToOne(() => Puzzles)
  puzzle: Puzzles;

  @Column()
  isCorrect: boolean;

  @CreateDateColumn()
  attemptTime: Date;

  @Column({ default: false })
  flaggedAsSuspicious: boolean;

  @Column({ nullable: true })
  blockExpiresAt: Date;
}

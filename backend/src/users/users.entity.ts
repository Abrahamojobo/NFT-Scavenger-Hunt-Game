/* eslint-disable prettier/prettier */
import { Leaderboard } from "src/leaderboard/entities/leaderboard.entity";
import { UserProgress } from "src/user-progress/user-progress.entity"; // Unified import path
import { Scores } from "src/scores/scores.entity";
import { Answer } from "src/answers/answers.entity";
import { Puzzles } from "src/puzzles/puzzles.entity";
import { NFTs } from "src/nfts/nfts.entity";
import { Hints } from "src/hints/hints.entity";
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from "typeorm";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  username: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => UserProgress, (userProgress) => userProgress.user, {
    cascade: true,
    eager: true,
  })
  userProgress: UserProgress[];

  @OneToMany(() => Leaderboard, (leaderboard) => leaderboard.user)
  leaderboardEntries: Leaderboard[];

  @OneToMany(() => Scores, (score) => score.user)
  scores: Scores[];

  @OneToMany(() => Answer, (answer) => answer.user)
  answers: Answer[];

  @OneToMany(() => Puzzles, (puzzle) => puzzle.answers, { cascade: true })
  puzzles: Puzzles[];

  @OneToMany(() => NFTs, (nft) => nft.user, { cascade: true })
  nfts: NFTs[];

  @OneToMany(() => Hints, (hint) => hint.answers, { cascade: true })
  hints: Hints[];
}
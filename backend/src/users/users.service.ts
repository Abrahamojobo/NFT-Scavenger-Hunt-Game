/* eslint-disable prettier/prettier */
import { forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserProvider } from './providers/create-user-provider.provider';
import { CreateUserDto } from './dtos/create-user-dto.dto';
import { FindByUsername } from './providers/find-by-username.provider';
import { AuthService } from '../auth/auth.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './users.entity';
import { UserProgress } from 'src/user-progress/user-progress.entity';
import { ScoresService } from 'src/scores/scores.service';
import { UserProgressService } from 'src/user-progress/user-progress.service';
import { Scores } from 'src/scores/scores.entity';

@Injectable()
export class UsersService {  
  constructor(
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService, // circular dependency injection of auth service

    @InjectRepository(User)
    private readonly usersRepository: Repository<User>, //dependency injection of user entity

    private readonly createUserProvider: CreateUserProvider, //dependency injection of create user provider

    private readonly findByUsername: FindByUsername, //dependency injection of find find User 

  ) {}

  public async createUser(createUserDto: CreateUserDto) {
    return await this.createUserProvider.createUsers(createUserDto);
  }

  public async FindByUsername(username: string) {
    return await this.findByUsername.FindOneByUsername(username);
  }

  public async findById(id: number): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }
}


import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateLevelDto } from './dto/create-level.dto';
import { UpdateLevelDto } from './dto/update-level.dto';
import { Level } from './entities/level.entity';
import { PuzzlesService } from 'src/puzzles/puzzles.service';


@Injectable()
export class LevelService {

  //provide repositry injection of level entity
  constructor(
    @InjectRepository(Level) 
    private readonly levelRepository: Repository<Level>,

    //proide dependency innjection of puzzle service
    private readonly puzzleService: PuzzlesService 
  ) {}

  async create(createLevelDto: CreateLevelDto) {
    const level = this.levelRepository.create(createLevelDto);
    return await this.levelRepository.save(level);
  }

  async findAll() {
    return await this.levelRepository.find({
      relations: ['puzzles'],
    });
  }

  async findOne(id: number) {
    const level = await this.levelRepository.findOne({
      where: { id },
      relations: ['puzzles'],
    });
    
    if (!level) {
      throw new NotFoundException(`Level with ID ${id} not found`);
    }
    
    return level;
  }

  async update(id: number, updateLevelDto: UpdateLevelDto) {
    const level = await this.findOne(id);
    Object.assign(level, updateLevelDto);
    return await this.levelRepository.save(level);
  }

  async remove(id: number) {
    const level = await this.findOne(id);
    return await this.levelRepository.remove(level);
  }

  async getTotalLevels(): Promise<number> {
    return this.levelRepository.count();
  }
}
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SecurityService } from './security.service';
import { IsAdmin } from '../auth/decorators/is-admin.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('security')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SecurityController {
  constructor(private readonly securityService: SecurityService) {}

  @Get('suspicious-attempts')
  @IsAdmin()
  async getSuspiciousAttempts(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    return this.securityService.getSuspiciousAttempts(page, limit);
  }
}

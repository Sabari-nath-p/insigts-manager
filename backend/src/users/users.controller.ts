import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { UserRole } from './user.entity';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.usersService.createUser(dto);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @Get()
  list() {
    return this.usersService.findAll();
  }

  // Literal routes must be declared before the ':id' route below, otherwise Nest would
  // try to match them as an id.
  @Get('team/status')
  teamStatus() {
    return this.usersService.listTeamStatus();
  }

  @Patch('me/status')
  updateMyStatus(@CurrentUser() user: { userId: string }, @Body() dto: UpdateStatusDto) {
    return this.usersService.updateStatus(user.userId, dto.status);
  }

  @Get('me/overview')
  myOverview(
    @CurrentUser() user: { userId: string },
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.usersService.getOverview(user.userId, from, to);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @Get(':id')
  detail(@Param('id') id: string) {
    return this.usersService.findByIdOrFail(id);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @Get(':id/overview')
  overview(@Param('id') id: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.usersService.getOverview(id, from, to);
  }
}

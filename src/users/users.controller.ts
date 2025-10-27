import { Controller, Get, Query } from '@nestjs/common';

import { UsersService } from './users.service';
import { JwtPayload } from 'src/auth/jwt.strategy';
import { User } from 'src/common/decorators';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Get()
  getUsers(@User() user: JwtPayload, @Query('q') q: string) {
    return this.usersService.getUsers(user, q);
  }
}

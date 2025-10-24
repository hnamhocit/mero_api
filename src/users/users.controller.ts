import { Controller, Get, Query, Req } from '@nestjs/common';
import { Request } from 'express';

import { UsersService } from './users.service';
import { JwtPayload } from 'src/auth/jwt.strategy';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  getUsers(@Req() req: Request, @Query('q') q: string) {
    return this.usersService.getUsers(req.user as JwtPayload, q);
  }
}

import { Controller, Get, Put, Req, UseGuards } from '@nestjs/common';

import { MeService } from './me.service';
import { JwtAuthGuard } from 'src/common/guards';
import { JwtPayload } from 'src/auth/jwt.strategy';
import { User } from 'src/common/decorators';

@Controller('me')
@UseGuards(JwtAuthGuard)
export class MeController {
  constructor(private readonly meService: MeService) { }

  @Get()
  getMe(@User() user: JwtPayload) {
    return this.meService.getMe(user);
  }

  @Put('/email-verified')
  setEmailVerified(@User() user: JwtPayload) {
    return this.meService.setEmailVerified(user);
  }

  @Get('/ids')
  getRequestAndFriendsIds(@User() user: JwtPayload) {
    return this.meService.getRequestAndFriendsIds(user);
  }

  @Get('/received-requests')
  getReceivedRequests(@User() user: JwtPayload) {
    return this.meService.getReceivedRequests(user);
  }

  @Get('/friends')
  getFriends(@User() user: JwtPayload) {
    return this.meService.getFriends(user);
  }

  @Get('/conversations')
  getConversations(@User() user: JwtPayload) {
    return this.meService.getConversations(user);
  }
}

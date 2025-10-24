import { Controller, Get, Put, Req, UseGuards } from '@nestjs/common';

import { MeService } from './me.service';
import { JwtAuthGuard } from 'src/common/guards';
import { Request } from 'express';
import { JwtPayload } from 'src/auth/jwt.strategy';

@Controller('me')
@UseGuards(JwtAuthGuard)
export class MeController {
  constructor(private readonly meService: MeService) {}

  @Get()
  getMe(@Req() req: Request) {
    return this.meService.getMe(req.user as JwtPayload);
  }

  @Put('/email-verified')
  setEmailVerified(@Req() req: Request) {
    return this.meService.setEmailVerified(req.user as JwtPayload);
  }

  @Get('/ids')
  getRequestAndFriendsIds(@Req() req: Request) {
    return this.meService.getRequestAndFriendsIds(req.user as JwtPayload);
  }

  @Get('/received-requests')
  getReceivedRequests(@Req() req: Request) {
    return this.meService.getReceivedRequests(req.user as JwtPayload);
  }

  @Get('/friends')
  getFriends(@Req() req: Request) {
    return this.meService.getFriends(req.user as JwtPayload);
  }

  @Get('/conversations')
  getConversations(@Req() req: Request) {
    return this.meService.getConversations(req.user as JwtPayload);
  }
}

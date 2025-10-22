import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDTO, RegisterDTO } from './dtos';
import { Request, Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() body: LoginDTO, @Res() res: Response) {
    return this.authService.login(body, res);
  }

  @Post('register')
  register(@Body() body: RegisterDTO, @Res() res: Response) {
    return this.authService.register(body, res);
  }

  @Get('refresh')
  refresh(@Req() req: Request, @Res() res: Response) {
    return this.authService.refresh(req, res);
  }

  @Get('logout')
  logout(@Req() req: Request, @Res() res: Response) {
    return this.authService.logout(req, res);
  }
}

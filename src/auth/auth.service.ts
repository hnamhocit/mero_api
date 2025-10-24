import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { generateVerificationCode, sendMail } from 'src/common/utils';
import * as bcrypt from 'bcrypt';

import { PrismaService } from 'src/prisma/prisma.service';
import { LoginDTO, RegisterDTO } from './dtos';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from './jwt.strategy';
import { Request, Response } from 'express';

const REFRESH_TOKEN_TTL = 30 * 24 * 60 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  private async generateTokens(payload: JwtPayload) {
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = crypto.randomBytes(64).toString('hex');

    await this.prisma.session.create({
      data: {
        userId: payload.sub,
        token: this.hashToken(refreshToken),
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL),
      },
    });

    return { accessToken, refreshToken };
  }

  private async sendVerificationEmail(id: number, email: string) {
    const verificationCode = generateVerificationCode();
    const verificationCodeExpiresAt = new Date(Date.now() + 1000 * 60 * 10);

    await this.prisma.user.update({
      where: { id },
      data: {
        verificationCode,
        verificationCodeExpiresAt,
      },
    });

    sendMail({
      to: email,
      subject: 'Confirm Your Email',
      templateName: 'confirm-email',
      args: {
        email,
        verificationCode,
      },
    });
  }

  private hashToken(token: string) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async login(payload: LoginDTO, res: Response) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: payload.email },
      select: { id: true, role: true, password: true },
    });

    if (!existingUser) {
      throw new BadRequestException('User not found');
    }

    const { password: hashedPassword, ...other } = existingUser;

    const isPasswordValid = await bcrypt.compare(
      payload.password,
      hashedPassword,
    );
    if (!isPasswordValid) {
      throw new BadRequestException('Invalid credentials');
    }

    const tokens = await this.generateTokens({
      sub: other.id,
      role: other.role,
    });

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: REFRESH_TOKEN_TTL,
    });

    return { accessToken: tokens.accessToken };
  }

  async register(payload: RegisterDTO, res: Response) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: payload.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(payload.password, 10);
    const newUser = await this.prisma.user.create({
      data: {
        email: payload.email,
        password: hashedPassword,
        displayName: payload.displayName,
      },
      select: { email: true, id: true, role: true },
    });

    const tokens = await this.generateTokens({
      sub: newUser.id,
      role: newUser.role,
    });
    this.sendVerificationEmail(newUser.id, newUser.email);

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: REFRESH_TOKEN_TTL,
    });

    return { accessToken: tokens.accessToken };
  }

  async logout(req: Request, res: Response) {
    const token = req.cookies?.refreshToken;

    if (token) {
      await this.prisma.session.delete({
        where: {
          token: this.hashToken(token),
        },
      });

      res.clearCookie('refreshToken');
    }

    return null;
  }

  async refresh(req: Request, res: Response) {
    const token = req.cookies?.refreshToken;
    if (!token) {
      throw new UnauthorizedException('Unauthorized');
    }

    const hashedToken = this.hashToken(token);

    const session = await this.prisma.session.findUnique({
      where: { token: hashedToken },
      include: { user: { select: { email: true, role: true, id: true } } },
    });

    if (!session) {
      res.clearCookie('refreshToken');
      throw new UnauthorizedException('Invalid token');
    }

    await this.prisma.session.delete({
      where: { id: session.id },
    });

    if (session.expiresAt < new Date()) {
      res.clearCookie('refreshToken');
      throw new UnauthorizedException('Token expired');
    }

    const payload = {
      sub: session.userId,
      role: session.user.role,
    };
    const newTokens = await this.generateTokens(payload);

    res.cookie('refreshToken', newTokens.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: REFRESH_TOKEN_TTL,
    });

    return {
      accessToken: newTokens.accessToken,
    };
  }
}

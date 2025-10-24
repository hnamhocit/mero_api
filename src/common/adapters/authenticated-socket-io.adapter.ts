// src/common/adapters/authenticated-socket-io.adapter.ts
import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { INestApplicationContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from 'src/auth/jwt.strategy';

@Injectable()
export class AuthenticatedSocketIoAdapter extends IoAdapter {
  constructor(
    private readonly app: INestApplicationContext,
    private readonly jwtService: JwtService,
  ) {
    super(app);
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, options);

    server.use(async (socket: Socket, next) => {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('No token provided'));
      }

      try {
        const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
          secret: process.env.JWT_ACCESS_SECRET,
        });

        (socket as any).user = payload;

        next();
      } catch (error) {
        console.error('Socket Auth Error:', error.message);
        return next(
          new Error('Authentication error: Invalid or expired token'),
        );
      }
    });
    return server;
  }
}

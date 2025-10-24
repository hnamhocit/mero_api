import { Socket } from 'socket.io';
import { JwtPayload } from 'src/auth/jwt.strategy';

export interface ISocket extends Socket {
  user: JwtPayload;
  socketId: string;
}

import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';

import { ISocket } from 'src/common/interfaces';
import { PrismaService } from 'src/prisma/prisma.service';
import { connectedUsers } from '../events.gateway';

@Injectable()
export class FriendHandler {
  public io: Server;

  constructor(private readonly prisma: PrismaService) {}

  async unfriend(socket: ISocket, args: any, cb: (response: any) => void) {
    const { friendId } = args;
    const userId = socket.user.sub;

    if (!friendId) return cb({ ok: false, message: '"friendId" is required' });
    if (userId === friendId)
      return cb({ ok: false, message: 'Cannot unfriend yourself' });

    try {
      await this.prisma.$transaction([
        this.prisma.friendship.deleteMany({
          where: { userId: userId, friendId: friendId },
        }),
        this.prisma.friendship.deleteMany({
          where: { userId: friendId, friendId: userId },
        }),
      ]);

      const friendSocket = connectedUsers.get(friendId);

      socket.emit('friend:removed', { friendId });
      friendSocket?.emit('friend:removed', { friendId: userId });

      cb({ ok: true, message: 'Unfriended successfully' });
    } catch (error) {
      console.error('Error unfriending:', error);
      cb({ ok: false, message: 'Failed to unfriend user' });
    }
  }
}

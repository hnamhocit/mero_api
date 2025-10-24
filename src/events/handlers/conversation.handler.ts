import { Injectable } from '@nestjs/common';

import { ISocket } from 'src/common/interfaces';
import { PrismaService } from 'src/prisma/prisma.service';
import { connectedUsers } from '../events.gateway';

@Injectable()
export class ConversationHandler {
  constructor(private readonly prisma: PrismaService) {}

  async create(socket: ISocket, args: any, cb: (response: any) => void) {
    const { name, photoURL, photoId, participantIds } = args;

    try {
      const newConversation = await this.prisma.conversation.create({
        data: {
          name,
          photoURL,
          photoId,
          participants: {
            createMany: {
              data: [
                ...participantIds.map((id: number) => ({ userId: id })),
                { userId: socket.user.sub, role: 'ADMIN' },
              ],
            },
          },
        },
        include: {
          participants: {
            include: {
              user: { select: { id: true, displayName: true } },
            },
          },
          lastMessage: {
            include: { sender: { select: { id: true, displayName: true } } },
          },
        },
      });

      [socket.user.sub, ...participantIds].forEach((id: number) => {
        const onlineSocket = connectedUsers.get(id);
        if (onlineSocket) {
          onlineSocket.join(`conversation-${newConversation.id}`);
          onlineSocket.emit('conversation:new', newConversation);
        }
      });

      cb({ ok: true, data: newConversation });
    } catch (error) {
      console.error('Failed to create conversation:', error);
      cb({ ok: false, message: 'Failed to create conversation' });
    }
  }
}

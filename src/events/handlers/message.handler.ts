import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';

import { ISocket } from 'src/common/interfaces';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class MessageHandler {
  public io: Server;

  constructor(private readonly prisma: PrismaService) {}

  async getConversationMessages(
    socket: ISocket,
    args: any,
    cb: (response: any) => void,
  ) {
    const { conversationId, cursor } = args;

    try {
      const messages = await this.prisma.message.findMany({
        where: {
          conversationId: conversationId,
          deletions: {
            none: {
              userId: socket.user.sub,
            },
          },
        },
        take: 20,
        skip: cursor ? 1 : 0,
        cursor: cursor
          ? {
              id: cursor,
            }
          : undefined,
        orderBy: {
          createdAt: 'asc',
        },
        include: {
          reply: {
            select: {
              id: true,
              content: true,
              sender: {
                select: {
                  id: true,
                  displayName: true,
                },
              },
            },
          },
          sender: {
            select: {
              id: true,
              displayName: true,
              photoURL: true,
            },
          },
        },
      });

      cb({ ok: true, data: messages });
    } catch (error) {
      console.error('Error fetching messages:', error);
      cb({ ok: false, message: 'Failed to fetch messages' });
    }
  }

  async send(socket: ISocket, args: any, cb?: (response: any) => void) {
    const { content, conversationId, replyId } = args;

    try {
      const newMessage = await this.prisma.message.create({
        data: {
          content,
          conversationId,
          replyId,
          senderId: socket.user.sub,
        },
        include: {
          sender: {
            select: {
              id: true,
              displayName: true,
              photoURL: true,
            },
          },
          reply: {
            select: {
              id: true,
              content: true,
              sender: {
                select: { id: true, displayName: true },
              },
            },
          },
        },
      });

      await this.prisma.conversation.update({
        where: { id: conversationId },
        data: { lastMessageId: newMessage.id },
      });

      if (this.io) {
        this.io
          .to(`conversation-${conversationId}`)
          .emit('message:new', newMessage);
      } else {
        console.warn(
          'Socket.IO server instance (io) not set in MessageService',
        );
      }

      if (cb) cb({ ok: true, data: newMessage });
    } catch (error) {
      console.error('Error sending message:', error);
      if (cb) cb({ ok: false, message: 'Failed to send message' });
    }
  }

  async delete(socket: ISocket, args: any, cb: (response: any) => void) {
    const { id } = args;
    if (!id) return cb({ ok: false, message: 'Message id is required' });

    try {
      const message = await this.prisma.message.findFirst({
        where: {
          id,
        },
        select: { conversationId: true, senderId: true },
      });

      if (!message)
        return cb({ ok: false, message: 'Message not found or not yours' });

      // Optional: Check sender
      // if (message.senderId !== socket.user.id) { ... }

      await this.prisma.message.delete({
        where: { id: id },
      });

      if (this.io) {
        this.io
          .to(`conversation-${message.conversationId}`)
          .emit('message:deleted', {
            id,
            conversationId: message.conversationId,
          });
      } else {
        console.warn(
          'Socket.IO server instance (io) not set in MessageService',
        );
      }

      cb({ ok: true, message: 'Message deleted' });
    } catch (error) {
      console.error('Error deleting message:', error);
      cb({ ok: false, message: 'Failed to delete message' });
    }
  }

  async deleteForMe(socket: ISocket, args: any, cb: (response: any) => void) {
    const { id } = args;
    if (!id) return cb({ ok: false, message: 'Message id is required' });

    try {
      const existingDeletion = await this.prisma.messageDeletion.findUnique({
        where: {
          userId_messageId: {
            userId: socket.user.sub,
            messageId: id,
          },
        },
      });

      if (existingDeletion) {
        return cb({ ok: false, message: 'Message already deleted for you' });
      }

      const messageExists = await this.prisma.message.count({ where: { id } });
      if (messageExists === 0) {
        return cb({ ok: false, message: 'Message not found' });
      }

      await this.prisma.messageDeletion.create({
        data: {
          messageId: id,
          userId: socket.user.sub,
        },
      });

      cb({ ok: true, message: 'Message deleted for you' });
    } catch (error) {
      console.error('Error deleting message for self:', error);
      cb({ ok: false, message: 'Failed to delete message for you' });
    }
  }
}

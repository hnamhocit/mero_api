import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';
import { ISocket } from 'src/common/interfaces';

import { PrismaService } from 'src/prisma/prisma.service';
import { connectedUsers } from '../events.gateway';
import { ConversationType } from 'generated/prisma/enums';

@Injectable()
export class FriendRequestHandler {
  public io: Server;

  constructor(private readonly prisma: PrismaService) {}

  async create(socket: ISocket, args: any, cb: (response: any) => void) {
    const { to, message } = args;

    if (!to) return cb({ ok: false, message: '"to" user ID is required' });
    if (to === socket.user.sub)
      return cb({ ok: false, message: 'You cannot add yourself' });

    try {
      const [existingRequest, friendship] = await Promise.all([
        this.prisma.friendRequest.findFirst({
          where: {
            OR: [
              { fromId: socket.user.sub, toId: to },
              { fromId: to, toId: socket.user.sub },
            ],
          },
        }),
        this.prisma.friendship.findFirst({
          where: {
            OR: [
              { userId: socket.user.sub, friendId: to },
              { userId: to, friendId: socket.user.sub },
            ],
          },
        }),
      ]);

      if (existingRequest)
        return cb({
          ok: false,
          message: 'Friend request already exists or pending',
        });
      if (friendship)
        return cb({ ok: false, message: 'You are already friends' });

      const friendRequest = await this.prisma.friendRequest.create({
        data: {
          toId: to,
          fromId: socket.user.sub,
          message,
        },
        include: {
          from: {
            select: {
              id: true,
              displayName: true,
              email: true,
              photoURL: true,
            },
          },
        },
      });

      const recipientSocket = connectedUsers.get(to);
      recipientSocket?.emit('friendRequest:new', friendRequest);

      cb({ ok: true, data: friendRequest });
    } catch (error) {
      console.error('Error creating friend request:', error);
      cb({ ok: false, message: 'Failed to send friend request' });
    }
  }

  async accept(socket: ISocket, args: any, cb: (response: any) => void) {
    const { fromId } = args;
    if (!fromId) return cb({ ok: false, message: '"fromId" is required' });

    try {
      const friendRequest = await this.prisma.friendRequest.findFirst({
        where: {
          fromId,
          toId: socket.user.sub,
        },
        include: {
          from: {
            select: {
              id: true,
              displayName: true,
              email: true,
              photoURL: true,
            },
          },
          to: {
            select: {
              id: true,
              displayName: true,
              email: true,
              photoURL: true,
            },
          },
        },
      });

      if (!friendRequest)
        return cb({
          ok: false,
          message: 'Friend request not found or already handled',
        });

      const [_, __, ___, conversation] = await this.prisma.$transaction([
        this.prisma.friendship.create({
          data: { userId: socket.user.sub, friendId: friendRequest.fromId },
        }),
        this.prisma.friendship.create({
          data: { userId: friendRequest.fromId, friendId: socket.user.sub },
        }),
        this.prisma.friendRequest.delete({
          where: { id: friendRequest.id },
        }),
        this.prisma.conversation.create({
          data: {
            type: ConversationType.DIRECT,
            participants: {
              create: [
                { userId: friendRequest.fromId },
                { userId: socket.user.sub },
              ],
            },
          },
          include: {
            participants: {
              include: {
                user: {
                  select: { id: true, displayName: true, photoURL: true },
                },
              },
            },
            lastMessage: {
              include: {
                sender: { select: { id: true, displayName: true } },
              },
            },
          },
        }),
      ]);

      // --- Emitting events ---
      const fromSocket = connectedUsers.get(friendRequest.fromId);
      const toSocket = connectedUsers.get(socket.user.sub);

      fromSocket?.emit('friendRequest:accepted', { friend: friendRequest.to });
      fromSocket?.emit('friend:new', friendRequest.to);
      toSocket?.emit('friend:new', friendRequest.from);

      const emitConversation = (
        targetSocket: any,
        conv: any,
        otherUserId: number,
      ) => {
        const otherUser = conv.participants.find(
          (p) => p.userId === otherUserId,
        )?.user;
        if (targetSocket && otherUser) {
          targetSocket.join(`conversation-${conv.id}`);
          targetSocket.emit('conversation:new', { ...conv, otherUser });
        }
      };
      emitConversation(fromSocket, conversation, socket.user.sub);
      emitConversation(toSocket, conversation, friendRequest.fromId);

      cb({ ok: true, message: 'Friend request accepted' });
    } catch (error) {
      console.error('Error accepting friend request:', error);
      cb({ ok: false, message: 'Failed to accept friend request' });
    }
  }

  async reject(socket: ISocket, args: any, cb: (response: any) => void) {
    const { fromId } = args;
    if (!fromId) return cb({ ok: false, message: '"fromId" is required' });

    try {
      const friendRequest = await this.prisma.friendRequest.findFirst({
        where: {
          fromId,
          toId: socket.user.sub,
        },
      });

      if (!friendRequest)
        return cb({
          ok: false,
          message: 'Friend request not found or already handled',
        });

      await this.prisma.friendRequest.delete({
        where: { id: friendRequest.id },
      });

      connectedUsers
        .get(friendRequest.fromId)
        ?.emit('friendRequest:rejected', { userId: socket.user.sub });

      cb({ ok: true, message: 'Friend request rejected' });
    } catch (error) {
      console.error('Error rejecting friend request:', error);
      cb({ ok: false, message: 'Failed to reject friend request' });
    }
  }
}

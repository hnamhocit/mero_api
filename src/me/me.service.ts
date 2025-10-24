import { Injectable } from '@nestjs/common';
import { JwtPayload } from 'src/auth/jwt.strategy';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class MeService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: payload.sub,
      },
    });

    return user;
  }

  async setEmailVerified(payload: JwtPayload) {
    await this.prisma.user.update({
      where: {
        id: payload.sub,
      },
      data: {
        isEmailVerified: true,
        verificationCode: null,
        verificationCodeExpiresAt: null,
      },
      select: { id: true },
    });

    return null;
  }

  async getRequestAndFriendsIds(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: payload.sub,
      },
      select: {
        id: true,
        friends: {
          select: {
            friendId: true,
          },
        },
      },
    });

    const requests = await this.prisma.friendRequest.findMany({
      where: {
        OR: [{ fromId: payload.sub }, { toId: payload.sub }],
      },
      select: {
        fromId: true,
        toId: true,
      },
    });

    return {
      friendIds: user!.friends.map((friend) => friend.friendId),
      receivedRequestIds: requests
        .filter((request) => request.toId === payload.sub)
        .map((req) => req.fromId),
      sentRequestIds: requests
        .filter((request) => request.fromId === payload.sub)
        .map((req) => req.toId),
    };
  }

  async getReceivedRequests(payload: JwtPayload) {
    const friendRequests = await this.prisma.friendRequest.findMany({
      where: { toId: payload.sub },
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

    return friendRequests;
  }

  async getFriends(payload: JwtPayload) {
    const friends = await this.prisma.friendship.findMany({
      where: { userId: payload.sub },
      include: {
        friend: {
          select: {
            id: true,
            displayName: true,
            email: true,
            photoURL: true,
          },
        },
      },
    });

    return friends.map((friend) => friend.friend);
  }

  async getConversations(payload: JwtPayload) {
    const [groups, directs] = await Promise.all([
      this.prisma.conversation.findMany({
        where: {
          type: 'GROUP',
          participants: { some: { userId: payload.sub } },
        },
        include: {
          lastMessage: {
            include: { sender: { select: { id: true, displayName: true } } },
          },
        },
      }),
      this.prisma.conversation.findMany({
        where: {
          type: 'DIRECT',
          participants: { some: { userId: payload.sub } },
        },
        include: {
          lastMessage: {
            include: { sender: { select: { id: true, displayName: true } } },
          },
          participants: {
            where: { NOT: { userId: payload.sub } },
            select: {
              user: { select: { id: true, displayName: true, photoURL: true } },
            },
          },
        },
      }),
    ]);

    return [
      ...groups,
      ...directs.map(({ participants, ...d }) => ({
        ...d,
        otherUser: participants[0]?.user,
      })),
    ];
  }
}

import { Injectable } from '@nestjs/common';
import { JwtPayload } from 'src/auth/jwt.strategy';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getUsers(payload: JwtPayload, q: string) {
    const users = await this.prisma.user.findMany({
      where: {
        AND: [
          {
            OR: [
              { email: { contains: q, mode: 'insensitive' } },
              { displayName: { contains: q, mode: 'insensitive' } },
            ],
          },
          {
            NOT: {
              id: payload.sub,
            },
          },
        ],
      },
      select: {
        id: true,
        displayName: true,
        bio: true,
        photoURL: true,
      },
    });

    return users;
  }
}

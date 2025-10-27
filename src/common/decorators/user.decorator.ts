import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorator @User() dùng để lấy thông tin user từ request.
 * Nó được gán vào request.user bởi một Guard (ví dụ: JwtAuthGuard).
 *
 * @example
 * // Lấy toàn bộ đối tượng user:
 * @Get()
 * getProfile(@User() user: UserEntity) { ... }
 *
 * // Lấy một thuộc tính cụ thể của user:
 * @Get()
 * getProfile(@User('id') userId: string) { ... }
 */
export const User = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();

    const user = request.user;

    if (data) {
      return user?.[data];
    }

    return user;
  },
);

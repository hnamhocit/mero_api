import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { Response } from 'express';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, any> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const now = Date.now();
    const httpContext = context.switchToHttp();
    const response = httpContext.getResponse<Response>();

    return next.handle().pipe(
      tap(() => {
        const responseTime = Date.now() - now;
        response.header('X-Response-Time', `${responseTime}ms`);
      }),
      map((data) => ({
        ok: true,
        data: data,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}

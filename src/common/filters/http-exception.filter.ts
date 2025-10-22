import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();

    const exceptionResponse = exception.getResponse();
    let errors: string[] | string = exceptionResponse['message'];

    response.status(status).json({
      ok: false,
      timestamp: new Date().toISOString(),
      errors: Array.isArray(errors) ? errors : [errors],
    });
  }
}

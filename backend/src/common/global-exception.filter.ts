import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly log = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const resp = exception.getResponse();
      message =
        typeof resp === 'string'
          ? resp
          : (resp as Record<string, unknown>).message?.toString() || exception.message;
    } else if (exception instanceof Error) {
      message = exception.message;
      this.log.error(`Unhandled: ${exception.message}`, exception.stack);
    }

    if (status >= 500) {
      this.log.error(`${req.method} ${req.url} -> ${status}: ${message}`);
    }

    res.status(status).json({
      statusCode: status,
      message,
      path: req.url,
      timestamp: new Date().toISOString(),
    });
  }
}

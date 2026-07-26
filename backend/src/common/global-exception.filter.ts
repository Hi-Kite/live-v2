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
    // Registered via APP_FILTER, this filter is also invoked for WebSocket
    // handlers — mimic the default ws behavior there instead of touching
    // the (nonexistent) HTTP response object.
    if (host.getType() !== 'http') {
      const message =
        exception instanceof Error ? exception.message : String(exception);
      this.log.error(`Non-HTTP exception: ${message}`);
      if (host.getType() === 'ws') {
        const client = host.switchToWs().getClient();
        client?.emit?.('exception', {
          status: 'error',
          message:
            exception instanceof HttpException ? message : 'Internal server error',
        });
      }
      return;
    }

    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const resp = exception.getResponse();
      // Preserve the original response body (including custom fields such
      // as `code`, and array-shaped validation messages) — only augment it.
      const body: Record<string, unknown> =
        typeof resp === 'string'
          ? { statusCode: status, message: resp }
          : { statusCode: status, ...(resp as Record<string, unknown>) };

      if (status >= 500) {
        this.log.error(
          `${req.method} ${req.url} -> ${status}: ${JSON.stringify(body.message)}`,
          exception.stack,
        );
      }

      res.status(status).json({
        ...body,
        path: req.url,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Unknown / non-HTTP exceptions (Prisma errors, programming errors, ...):
    // log the real cause, but never leak internals to the client.
    const status = HttpStatus.INTERNAL_SERVER_ERROR;
    if (exception instanceof Error) {
      this.log.error(
        `${req.method} ${req.url} -> ${status}: ${exception.message}`,
        exception.stack,
      );
    } else {
      this.log.error(`${req.method} ${req.url} -> ${status}: ${String(exception)}`);
    }

    res.status(status).json({
      statusCode: status,
      message: 'Internal server error',
      path: req.url,
      timestamp: new Date().toISOString(),
    });
  }
}

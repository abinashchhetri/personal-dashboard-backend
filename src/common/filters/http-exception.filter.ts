// src/common/filters/http-exception.filter.ts
// ─────────────────────────────────────────────────────────────────────────────
// HttpExceptionFilter
// ─────────────────────────────────────────────────────────────────────────────
// Catches all unhandled HTTP exceptions and returns a consistent error shape.
// Applied globally in main.ts.
// ─────────────────────────────────────────────────────────────────────────────

import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse = exception.getResponse();
    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : (exceptionResponse as Record<string, unknown>).message ?? 'An error occurred';

    this.logger.error(`${request.method} ${request.url} → ${status}`);

    response.status(status).json({
      success: false,
      statusCode: status,
      message: Array.isArray(message) ? message[0] : message,
      errors: Array.isArray(message) ? message : undefined,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}

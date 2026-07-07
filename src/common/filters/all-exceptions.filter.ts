import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { PinoLogger } from 'nestjs-pino';

interface ErrorResponseBody {
  statusCode: number;
  message: string | string[];
  errors: unknown;
}

const GENERIC_ERROR_MESSAGE =
  'An unexpected error occurred while processing your request. Please try again later.';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(AllExceptionsFilter.name);
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { statusCode, message, errors } = this.resolveException(exception);

    if (statusCode >= 500) {
      this.logger.error(
        { err: exception, path: request.url, method: request.method },
        'Unhandled exception',
      );
    } else {
      this.logger.warn(
        { path: request.url, method: request.method, statusCode },
        'Handled exception',
      );
    }

    const body: ErrorResponseBody = { statusCode, message, errors };
    response.status(statusCode).json(body);
  }

  private resolveException(exception: unknown): {
    statusCode: number;
    message: string | string[];
    errors: unknown;
  } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();

      if (typeof response === 'string') {
        return { statusCode: status, message: response, errors: null };
      }

      const responseObj = response as Record<string, unknown>;
      return {
        statusCode: status,
        message:
          (responseObj.message as string | string[]) ?? exception.message,
        errors: responseObj.errors ?? null,
      };
    }

    // Raw (non-HttpException) errors from lower layers (TypeORM, validation
    // libraries, ...). Only well-understood error types get a specific status
    // and message; anything else falls through to the generic 500 below so
    // internal details (stack traces, query text) never reach the client.
    if (exception instanceof Error) {
      if (exception.name === 'QueryFailedError') {
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Invalid request data',
          errors: null,
        };
      }

      if (exception.name === 'ValidationError') {
        return {
          statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
          message: exception.message || 'Validation failed',
          errors: null,
        };
      }
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: GENERIC_ERROR_MESSAGE,
      errors: null,
    };
  }
}

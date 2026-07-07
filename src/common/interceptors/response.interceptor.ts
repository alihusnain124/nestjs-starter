import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import { Response } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ResponseEnvelope<T> {
  statusCode: number;
  message: string;
  data: T;
}

/**
 * Controllers normally just return the raw entity/array/DTO. A handler can
 * still override the default status/message by returning
 * `{ statusCode?, message?, data }` instead - this reads those fields back
 * out without assuming every handler uses that shape.
 */
function extractField(value: unknown, key: string): unknown {
  if (typeof value === 'object' && value !== null && key in value) {
    return (value as Record<string, unknown>)[key];
  }
  return undefined;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  ResponseEnvelope<T> | StreamableFile
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ResponseEnvelope<T> | StreamableFile> {
    return next.handle().pipe(
      map((result) => {
        // File downloads bypass the envelope so streaming isn't broken.
        if (result instanceof StreamableFile) {
          return result;
        }

        const httpResponse = context.switchToHttp().getResponse<Response>();

        const statusCode =
          (extractField(result, 'statusCode') as number | undefined) ??
          httpResponse.statusCode;
        httpResponse.status(statusCode);

        const message =
          (extractField(result, 'message') as string | undefined) ?? 'Success.';

        const shapedData = extractField(result, 'data');
        const data = (shapedData !== undefined ? shapedData : result) as T;

        return { statusCode, message, data };
      }),
    );
  }
}

import { applyDecorators, HttpStatus, Type } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';

interface ErrorResponseSpec {
  error: string;
  message: string | string[];
}

const ERROR_SPECS: Record<number, ErrorResponseSpec> = {
  [HttpStatus.BAD_REQUEST]: {
    error: 'BadRequestException',
    message: ['field must not be empty'],
  },
  [HttpStatus.UNAUTHORIZED]: {
    error: 'UnauthorizedException',
    message: 'Invalid credentials',
  },
  [HttpStatus.FORBIDDEN]: {
    error: 'ForbiddenException',
    message: 'Forbidden resource',
  },
  [HttpStatus.NOT_FOUND]: {
    error: 'NotFoundException',
    message: 'Resource not found',
  },
  [HttpStatus.CONFLICT]: {
    error: 'ConflictException',
    message: 'Resource already exists',
  },
  [HttpStatus.UNPROCESSABLE_ENTITY]: {
    error: 'UnprocessableEntityException',
    message: 'Unable to process request',
  },
  [HttpStatus.TOO_MANY_REQUESTS]: {
    error: 'ThrottlerException',
    message: 'Too Many Requests',
  },
  [HttpStatus.INTERNAL_SERVER_ERROR]: {
    error: 'InternalServerError',
    message: 'Internal server error',
  },
};

const errorEnvelopeSchema = (status: number) => {
  const spec = ERROR_SPECS[status];

  return {
    status,
    description: spec.error,
    schema: {
      properties: {
        success: { type: 'boolean', example: false },
        statusCode: { type: 'number', example: status },
        timestamp: { type: 'string', example: new Date().toISOString() },
        path: { type: 'string', example: '/api/v1/example' },
        message: Array.isArray(spec.message)
          ? { type: 'array', items: { type: 'string' }, example: spec.message }
          : { type: 'string', example: spec.message },
        error: { type: 'string', example: spec.error },
      },
    },
  };
};

/**
 * Documents the success envelope every response is wrapped in by the global
 * ResponseInterceptor: { success, statusCode, timestamp, path, data }.
 */
export function ApiSuccessResponse<TModel extends Type<unknown>>(
  model: TModel,
  options: { status?: number; isArray?: boolean; description?: string } = {},
) {
  const { status = HttpStatus.OK, isArray = false, description } = options;

  const dataSchema = isArray
    ? { type: 'array', items: { $ref: getSchemaPath(model) } }
    : { $ref: getSchemaPath(model) };

  return applyDecorators(
    ApiExtraModels(model),
    ApiResponse({
      status,
      description,
      schema: {
        properties: {
          success: { type: 'boolean', example: true },
          statusCode: { type: 'number', example: status },
          timestamp: { type: 'string', example: new Date().toISOString() },
          path: { type: 'string', example: '/api/v1/example' },
          data: dataSchema,
        },
      },
    }),
  );
}

/**
 * Documents one or more error envelopes produced by the global
 * AllExceptionsFilter: { success: false, statusCode, timestamp, path, message, error }.
 * Defaults to the errors every guarded endpoint can produce (400/401/404/500).
 */
export function ApiErrorResponses(...statuses: (keyof typeof ERROR_SPECS)[]) {
  const codes =
    statuses.length > 0
      ? statuses
      : [
          HttpStatus.BAD_REQUEST,
          HttpStatus.UNAUTHORIZED,
          HttpStatus.NOT_FOUND,
          HttpStatus.INTERNAL_SERVER_ERROR,
        ];

  return applyDecorators(
    ...codes.map((status) => ApiResponse(errorEnvelopeSchema(status))),
  );
}

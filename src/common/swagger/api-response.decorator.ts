import { applyDecorators, HttpStatus, Type } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';

interface ErrorResponseSpec {
  description: string;
  message: string | string[];
}

const GENERIC_ERROR_MESSAGE =
  'An unexpected error occurred while processing your request. Please try again later.';

const ERROR_SPECS: Record<number, ErrorResponseSpec> = {
  [HttpStatus.BAD_REQUEST]: {
    description: 'BadRequestException',
    message: ['field must not be empty'],
  },
  [HttpStatus.UNAUTHORIZED]: {
    description: 'UnauthorizedException',
    message: 'Invalid credentials',
  },
  [HttpStatus.FORBIDDEN]: {
    description: 'ForbiddenException',
    message: 'Forbidden resource',
  },
  [HttpStatus.NOT_FOUND]: {
    description: 'NotFoundException',
    message: 'Resource not found',
  },
  [HttpStatus.CONFLICT]: {
    description: 'ConflictException',
    message: 'Resource already exists',
  },
  [HttpStatus.UNPROCESSABLE_ENTITY]: {
    description: 'UnprocessableEntityException',
    message: 'Unable to process request',
  },
  [HttpStatus.TOO_MANY_REQUESTS]: {
    description: 'ThrottlerException',
    message: 'Too Many Requests',
  },
  [HttpStatus.INTERNAL_SERVER_ERROR]: {
    description: 'InternalServerError',
    message: GENERIC_ERROR_MESSAGE,
  },
};

const errorEnvelopeSchema = (status: number) => {
  const spec = ERROR_SPECS[status];

  return {
    status,
    description: spec.description,
    schema: {
      properties: {
        statusCode: { type: 'number', example: status },
        message: Array.isArray(spec.message)
          ? { type: 'array', items: { type: 'string' }, example: spec.message }
          : { type: 'string', example: spec.message },
        errors: { type: 'object', nullable: true, example: null },
      },
    },
  };
};

/**
 * Documents the success envelope every response is wrapped in by the global
 * ResponseInterceptor: { statusCode, message, data }.
 */
export function ApiSuccessResponse<TModel extends Type<unknown>>(
  model: TModel,
  options: {
    status?: number;
    isArray?: boolean;
    description?: string;
    message?: string;
  } = {},
) {
  const {
    status = HttpStatus.OK,
    isArray = false,
    description,
    message = 'Success.',
  } = options;

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
          statusCode: { type: 'number', example: status },
          message: { type: 'string', example: message },
          data: dataSchema,
        },
      },
    }),
  );
}

/**
 * Documents one or more error envelopes produced by the global
 * AllExceptionsFilter: { statusCode, message, errors }.
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

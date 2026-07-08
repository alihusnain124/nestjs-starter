import { HttpStatus } from '@nestjs/common';
import { ApiResponseOptions } from '@nestjs/swagger';
export function createApiResponse(
  status: HttpStatus,
  message: string,
  exampleData?: string | object,
  exampleErrors?: Record<string, string[]>,
): ApiResponseOptions {
  const isClassReference =
    typeof exampleData === 'function' ||
    (Array.isArray(exampleData) &&
      exampleData.some((item) => typeof item === 'function'));

  return {
    schema: {
      properties: {
        statusCode: { type: 'number', example: status },
        message: { type: 'string', example: message },
        ...(exampleData !== undefined &&
          !isClassReference && {
            data: {
              type: typeof exampleData === 'string' ? 'string' : 'object',
              example: exampleData,
            },
          }),
        ...(exampleErrors && {
          errors: {
            type: 'object',
            example: exampleErrors,
          },
        }),
      },
      required: ['message', 'statusCode'],
    },
  };
}

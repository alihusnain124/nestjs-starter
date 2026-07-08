import { HttpStatus } from '@nestjs/common';
import { ApiResponseOptions } from '@nestjs/swagger';
export function createApiResponse(
  status: HttpStatus,
  message: string,
  exampleData?: string | object,
  exampleErrors?: Record<string, string[]>,
  exampleTrackingNumber?: string,
): ApiResponseOptions {
  return {
    schema: {
      properties: {
        statusCode: { type: 'number', example: status },
        message: { type: 'string', example: message },
        ...(exampleData !== undefined && {
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
        ...(exampleTrackingNumber && {
          trackingNumber: {
            type: 'string',
            example: exampleTrackingNumber,
          },
        }),
      },
      required: ['message', 'statusCode'],
    },
  };
}

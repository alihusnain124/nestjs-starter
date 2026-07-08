import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
  ValidationPipe,
  type ValidationPipeOptions,
} from '@nestjs/common';
import { ValidationError } from 'class-validator';
import { formatErrorTitle } from '../utils/generalHelper.util';

const PRIORITIZED_CONSTRAINTS = [
  'isString',
  'isNumber',
  'isInt',
  'isBoolean',
  'isEnum',
  'isUuid',
  'isEmail',
  'isDateString',
  'min',
  'max',
  'minLength',
  'maxLength',
  'length',
];

@Injectable()
export class FormValidationPipe implements PipeTransform {
  private readonly validationPipe: ValidationPipe;

  constructor(options: ValidationPipeOptions = {}) {
    this.validationPipe = new ValidationPipe({
      ...options,
      exceptionFactory: (errors: ValidationError[]) => {
        const result: Record<string, string[]> = {};

        const processErrors = (
          error: ValidationError,
          propertyPath: string,
        ) => {
          const fieldName = propertyPath.split('.').pop() ?? 'Unknown Field';
          const displayName = formatErrorTitle(fieldName);
          const constraints = error.constraints ?? {};

          for (const key of PRIORITIZED_CONSTRAINTS) {
            if (constraints[key]) {
              result[propertyPath] ??= [];
              result[propertyPath].push(
                constraints[key].replace(fieldName, displayName),
              );
              break;
            }
          }

          error.children?.forEach((childError) => {
            processErrors(childError, `${propertyPath}.${childError.property}`);
          });
        };

        errors.forEach((error) => processErrors(error, error.property));

        const formErrors = Object.values(result).flat();
        const uniqueErrorCount = Object.keys(result).length;

        return new BadRequestException({
          errors: result,
          error: 'Bad Request',
          message:
            formErrors.length > 1
              ? `${formErrors[0]} and (${uniqueErrorCount - 1}) more`
              : formErrors[0],
          statusCode: 400,
        });
      },
    });
  }

  transform(value: unknown, metadata: ArgumentMetadata) {
    return this.validationPipe.transform(value, metadata);
  }
}

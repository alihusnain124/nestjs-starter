import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { createApiResponse } from '../../common/swagger/api-response.decorator';
import { UpdateUserDto } from './dto/update-user.dto';
import { User, UserRole } from './entities/user.entity';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List all users (admin only)' })
  @ApiOkResponse(
    createApiResponse(HttpStatus.OK, 'Users retrieved successfully.'),
  )
  @ApiUnauthorizedResponse(
    createApiResponse(HttpStatus.UNAUTHORIZED, 'Invalid credentials.'),
  )
  @ApiForbiddenResponse(
    createApiResponse(HttpStatus.FORBIDDEN, 'Forbidden resource.'),
  )
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a user by id' })
  @ApiOkResponse(
    createApiResponse(HttpStatus.OK, 'User retrieved successfully.', User),
  )
  @ApiUnauthorizedResponse(
    createApiResponse(HttpStatus.UNAUTHORIZED, 'Invalid credentials.'),
  )
  @ApiNotFoundResponse(
    createApiResponse(HttpStatus.NOT_FOUND, 'User not found.'),
  )
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a user' })
  @ApiOkResponse(
    createApiResponse(HttpStatus.OK, 'User updated successfully.', User),
  )
  @ApiBadRequestResponse(
    createApiResponse(HttpStatus.BAD_REQUEST, 'Validation errors occurred.'),
  )
  @ApiUnauthorizedResponse(
    createApiResponse(HttpStatus.UNAUTHORIZED, 'Invalid credentials.'),
  )
  @ApiNotFoundResponse(
    createApiResponse(HttpStatus.NOT_FOUND, 'User not found.'),
  )
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a user (admin only)' })
  @ApiNoContentResponse(
    createApiResponse(HttpStatus.NO_CONTENT, 'User deleted successfully.'),
  )
  @ApiUnauthorizedResponse(
    createApiResponse(HttpStatus.UNAUTHORIZED, 'Invalid credentials.'),
  )
  @ApiForbiddenResponse(
    createApiResponse(HttpStatus.FORBIDDEN, 'Forbidden resource.'),
  )
  @ApiNotFoundResponse(
    createApiResponse(HttpStatus.NOT_FOUND, 'User not found.'),
  )
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.remove(id);
  }
}

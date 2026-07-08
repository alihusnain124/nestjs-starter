import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { createApiResponse } from '../../common/swagger/api-response.decorator';
import { User } from '../users/entities/user.entity';
import type { AuthenticatedUser } from './types/authenticated-user.type';
import { AuthService } from './auth.service';
import { AuthenticatedUserResponseDto } from './dto/authenticated-user-response.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { TokenPairResponseDto } from './dto/token-pair-response.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiCreatedResponse(
    createApiResponse(
      HttpStatus.CREATED,
      'User registered successfully.',
      User,
    ),
  )
  @ApiBadRequestResponse(
    createApiResponse(HttpStatus.BAD_REQUEST, 'Validation errors occurred.'),
  )
  @ApiConflictResponse(
    createApiResponse(HttpStatus.CONFLICT, 'User already exists.'),
  )
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Exchange credentials for an access/refresh token pair',
  })
  @ApiOkResponse(
    createApiResponse(HttpStatus.OK, 'Login successful.', TokenPairResponseDto),
  )
  @ApiBadRequestResponse(
    createApiResponse(HttpStatus.BAD_REQUEST, 'Validation errors occurred.'),
  )
  @ApiUnauthorizedResponse(
    createApiResponse(HttpStatus.UNAUTHORIZED, 'Invalid credentials.'),
  )
  async login(@Body() loginDto: LoginDto) {
    const user = await this.authService.validateUser(
      loginDto.email,
      loginDto.password,
    );
    return this.authService.login(user);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange a refresh token for a new token pair' })
  @ApiOkResponse(
    createApiResponse(
      HttpStatus.OK,
      'Token pair refreshed.',
      TokenPairResponseDto,
    ),
  )
  @ApiUnauthorizedResponse(
    createApiResponse(
      HttpStatus.UNAUTHORIZED,
      'Invalid or expired refresh token.',
    ),
  )
  refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refresh(refreshTokenDto.refreshToken);
  }

  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the currently authenticated user' })
  @ApiOkResponse(
    createApiResponse(
      HttpStatus.OK,
      'Currently authenticated user.',
      AuthenticatedUserResponseDto,
    ),
  )
  @ApiUnauthorizedResponse(
    createApiResponse(HttpStatus.UNAUTHORIZED, 'Invalid credentials.'),
  )
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }
}

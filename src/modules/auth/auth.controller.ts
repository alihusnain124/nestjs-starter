import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  ApiErrorResponses,
  ApiSuccessResponse,
} from '../../common/swagger/api-response.decorator';
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
  @ApiSuccessResponse(User, {
    status: HttpStatus.CREATED,
    description: 'User registered successfully',
  })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.CONFLICT)
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Exchange credentials for an access/refresh token pair',
  })
  @ApiSuccessResponse(TokenPairResponseDto, {
    description: 'Login successful',
  })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.UNAUTHORIZED)
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
  @ApiSuccessResponse(TokenPairResponseDto, {
    description: 'Token pair refreshed',
  })
  @ApiErrorResponses(HttpStatus.UNAUTHORIZED)
  refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refresh(refreshTokenDto.refreshToken);
  }

  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the currently authenticated user' })
  @ApiSuccessResponse(AuthenticatedUserResponseDto, {
    description: 'Currently authenticated user',
  })
  @ApiErrorResponses(HttpStatus.UNAUTHORIZED)
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }
}

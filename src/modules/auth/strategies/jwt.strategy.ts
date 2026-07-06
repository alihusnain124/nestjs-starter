import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../users/users.service';
import { AuthenticatedUser } from '../types/authenticated-user.type';
import { TokenPayload } from '../types/token-payload.type';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret') as string,
    });
  }

  async validate(payload: TokenPayload): Promise<AuthenticatedUser> {
    const user = await this.usersService.findOne(payload.sub).catch(() => null);

    if (!user || !user.isActive) {
      throw new UnauthorizedException(
        'User account is disabled or no longer exists',
      );
    }

    return { id: user.id, email: user.email, role: user.role };
  }
}

import { UserRole } from '../../users/entities/user.entity';

export interface TokenPayload {
  sub: string;
  email: string;
  role: UserRole;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

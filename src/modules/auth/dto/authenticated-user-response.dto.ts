import { UserRole } from '../../users/entities/user.entity';

export class AuthenticatedUserResponseDto {
  id: string;
  email: string;
  role: UserRole;
}

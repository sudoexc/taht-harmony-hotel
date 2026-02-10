import { IsEnum } from 'class-validator';
import { AppRole } from '@prisma/client';

export class UpdateUserRoleDto {
  @IsEnum(AppRole)
  role!: AppRole;
}

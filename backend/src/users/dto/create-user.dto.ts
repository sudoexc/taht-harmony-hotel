import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';
import { AppRole } from '@prisma/client';

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsString()
  full_name!: string;

  @IsEnum(AppRole)
  role!: AppRole;
}

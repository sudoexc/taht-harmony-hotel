import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsString()
  full_name!: string;

  @IsString()
  hotel_name!: string;

  @IsOptional()
  @IsString()
  timezone?: string;
}

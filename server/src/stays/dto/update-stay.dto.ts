import { IsDateString, IsEnum, IsOptional, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { StayStatus } from '@prisma/client';

export class UpdateStayDto {
  @IsOptional()
  @IsString()
  room_id?: string;

  @IsOptional()
  @IsString()
  guest_name?: string;

  @IsOptional()
  @IsString()
  guest_phone?: string | null;

  @IsOptional()
  @IsDateString()
  check_in_date?: string;

  @IsOptional()
  @IsDateString()
  check_out_date?: string;

  @IsOptional()
  @IsEnum(StayStatus)
  status?: StayStatus;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  price_per_night?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  weekly_discount_amount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  manual_adjustment_amount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  deposit_expected?: number;

  @IsOptional()
  @IsString()
  comment?: string | null;
}

import { IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { RoomType } from '@prisma/client';

export class UpdateRoomDto {
  @IsOptional()
  @IsString()
  number?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  floor?: number;

  @IsOptional()
  @IsEnum(RoomType)
  room_type?: RoomType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  capacity?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  base_price?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsString()
  notes?: string | null;
}

import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ExpenseCategory, PaymentMethod } from '@prisma/client';

export class CreateExpenseDto {
  @IsOptional()
  @IsDateString()
  spent_at?: string;

  @IsOptional()
  @IsEnum(ExpenseCategory)
  category?: ExpenseCategory;

  @IsOptional()
  @IsEnum(PaymentMethod)
  method?: PaymentMethod;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsString()
  comment?: string | null;
}

import { IsDateString } from 'class-validator';

export class ReportsQueryDto {
  @IsDateString()
  from!: string;

  @IsDateString()
  to!: string;
}

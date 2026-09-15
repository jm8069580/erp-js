import { IsEnum, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AccountNature, AccountType } from '@prisma/client';

const CODE_PATTERN = /^\d{1,3}(\.\d{1,3}){0,4}$/;

export class CreateAccountDto {
  @ApiProperty({ example: '1.1.01' })
  @IsString()
  @Matches(CODE_PATTERN, {
    message: 'code must be numeric and follow levels separated by dots (e.g. 1.1.01)',
  })
  code: string;

  @ApiProperty({ example: 'CAJA' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ enum: AccountType, example: AccountType.ACTIVO })
  @IsEnum(AccountType)
  type: AccountType;

  @ApiPropertyOptional({ enum: AccountNature, description: 'Defaults from account type' })
  @IsEnum(AccountNature)
  @IsOptional()
  nature?: AccountNature;

  @ApiPropertyOptional({ example: 'uuid-de-la-cuenta-padre' })
  @IsString()
  @IsOptional()
  parentId?: string;
}
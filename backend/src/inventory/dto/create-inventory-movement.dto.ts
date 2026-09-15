import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InventoryMovementType } from '@prisma/client';

export class CreateInventoryMovementDto {
  @ApiProperty({ example: 'uuid-del-producto' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ enum: InventoryMovementType, example: InventoryMovementType.ENTRY })
  @IsEnum(InventoryMovementType)
  type: InventoryMovementType;

  @ApiProperty({ description: 'Cantidad movida (ENTRY/EXIT) o stock final deseado (ADJUSTMENT)', example: 10 })
  @IsInt()
  @Min(0)
  quantity: number;

  @ApiPropertyOptional({ example: 'Compra a proveedor' })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  reason?: string;
}

export class ListInventoryMovementsQueryDto {
  @ApiPropertyOptional({ example: 'uuid-del-producto' })
  @IsString()
  @IsOptional()
  productId?: string;

  @ApiPropertyOptional({ enum: InventoryMovementType })
  @IsEnum(InventoryMovementType)
  @IsOptional()
  type?: InventoryMovementType;
}
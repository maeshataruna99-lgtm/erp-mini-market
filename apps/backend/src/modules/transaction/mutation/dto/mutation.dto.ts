import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMutationItemDto {
  @ApiProperty({ example: 'product-id' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ example: 10 })
  @IsInt()
  @Min(1, { message: 'Qty minimal 1' })
  qty: number;
}

export class CreateMutationDto {
  @ApiProperty({ example: 'unit-central' })
  @IsString()
  @IsNotEmpty()
  fromUnitId: string;

  @ApiProperty({ example: 'unit-branch' })
  @IsString()
  @IsNotEmpty()
  toUnitId: string;

  @ApiProperty({ type: [CreateMutationItemDto] })
  @IsArray()
  @ArrayMinSize(1, { message: 'Minimal 1 item mutasi' })
  @ValidateNested({ each: true })
  @Type(() => CreateMutationItemDto)
  items: CreateMutationItemDto[];
}

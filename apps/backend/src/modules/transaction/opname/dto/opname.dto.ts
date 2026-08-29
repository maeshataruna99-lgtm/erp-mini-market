import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOpnameSessionDto {
  @ApiProperty({ example: 'unit-central' })
  @IsString()
  @IsNotEmpty({ message: 'unitId wajib diisi' })
  unitId: string;

  @ApiPropertyOptional({ description: 'scope: ALL atau kategori' })
  @IsOptional()
  @IsString()
  scope?: string;

  @ApiPropertyOptional({ example: '2026-08-29' })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}

export class BlindCountItemDto {
  @ApiProperty({ example: 'product-id' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ example: 115 })
  @IsInt()
  @Min(0)
  qtyPhysical: number;

  @ApiPropertyOptional({ example: 'Barang hilang 5 pcs' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class BlindCountDto {
  @ApiProperty({ type: [BlindCountItemDto] })
  @IsArray()
  @ArrayMinSize(1, { message: 'Minimal 1 item' })
  @ValidateNested({ each: true })
  @Type(() => BlindCountItemDto)
  items: BlindCountItemDto[];
}

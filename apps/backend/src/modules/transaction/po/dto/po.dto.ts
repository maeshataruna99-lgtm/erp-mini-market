import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { POStatus } from '@prisma/client';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePoItemDto {
  @ApiProperty({ example: 'produk-id' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ example: 50 })
  @IsInt()
  @Min(1)
  qtyOrder: number;

  @ApiProperty({ example: 2500 })
  @IsNumber()
  @Min(0)
  price: number;
}

export class CreatePoDto {
  @ApiProperty({ example: 'supplier-id' })
  @IsString()
  @IsNotEmpty({ message: 'supplierId wajib diisi' })
  supplierId: string;

  @ApiPropertyOptional({ example: 'Prioritas stok mie instan' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [CreatePoItemDto] })
  @IsArray()
  @ArrayMinSize(1, { message: 'Minimal 1 item pesanan' })
  @ValidateNested({ each: true })
  @Type(() => CreatePoItemDto)
  items: CreatePoItemDto[];
}

export class QueryPoDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ description: 'Cari nomor PO / supplier' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: POStatus })
  @IsOptional()
  @IsEnum(POStatus)
  status?: POStatus;
}

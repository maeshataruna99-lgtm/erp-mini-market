import {
  ApiProperty,
  ApiPropertyOptional,
  PartialType,
} from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'IND-GOR-001' })
  @IsString()
  @IsNotEmpty({ message: 'SKU wajib diisi' })
  sku: string;

  @ApiPropertyOptional({ example: '8991002102200' })
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiProperty({ example: 'Indomie Goreng' })
  @IsString()
  @IsNotEmpty({ message: 'Nama produk wajib diisi' })
  name: string;

  @ApiPropertyOptional({ example: 'Makanan' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ example: 'pcs' })
  @IsString()
  @IsNotEmpty({ message: 'Satuan wajib diisi' })
  unit: string;

  @ApiPropertyOptional({ example: 50, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  minStock?: number;

  @ApiProperty({ example: 2500 })
  @IsNumber()
  @Min(0)
  costPrice: number;

  @ApiProperty({ example: 3500 })
  @IsNumber()
  @Min(0)
  sellPrice: number;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  isPerishable?: boolean;
}

export class UpdateProductDto extends PartialType(CreateProductDto) {}

export class CreateProductBatchDto {
  @ApiProperty({ example: 'unit-central' })
  @IsString()
  @IsNotEmpty({ message: 'unitId wajib diisi' })
  unitId: string;

  @ApiPropertyOptional({ example: 'BATCH-001' })
  @IsOptional()
  @IsString()
  batchNo?: string;

  @ApiProperty({ example: 50 })
  @IsInt()
  @Min(0)
  qty: number;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;
}

export class QueryProductDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ description: 'Cari nama/SKU' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter kategori' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ enum: ['all', 'low', 'ok', 'out'], default: 'all' })
  @IsOptional()
  @IsString()
  stockStatus?: 'all' | 'low' | 'ok' | 'out';
}

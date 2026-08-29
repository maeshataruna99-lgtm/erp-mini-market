import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateSupplierDto {
  @ApiProperty({ example: 'PT Indofood CBP' })
  @IsString()
  @IsNotEmpty({ message: 'Nama supplier wajib diisi' })
  name: string;

  @ApiPropertyOptional({ example: '021-5551001' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'sales@indofood.co.id' })
  @IsOptional()
  @IsEmail({}, { message: 'Email tidak valid' })
  email?: string;

  @ApiPropertyOptional({ example: 'Jakarta' })
  @IsOptional()
  @IsString()
  address?: string;
}

export class UpdateSupplierDto extends PartialType(CreateSupplierDto) {}

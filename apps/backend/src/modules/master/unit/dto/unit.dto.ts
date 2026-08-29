import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateUnitDto {
  @ApiProperty({ example: 'Gudang Pusat' })
  @IsString()
  @IsNotEmpty({ message: 'Nama unit wajib diisi' })
  name: string;

  @ApiPropertyOptional({ example: true, default: false })
  @IsOptional()
  @IsBoolean()
  isCentral?: boolean;

  @ApiPropertyOptional({ example: 'Jl. Raya No.1' })
  @IsOptional()
  @IsString()
  address?: string;
}

export class UpdateUnitDto extends PartialType(CreateUnitDto) {}

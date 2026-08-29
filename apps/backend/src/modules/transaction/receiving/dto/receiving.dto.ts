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

export class CreateReceivingDto {
  @ApiProperty({ example: 'po-id' })
  @IsString()
  @IsNotEmpty()
  poId: string;

  @ApiProperty({ example: 'unit-central' })
  @IsString()
  @IsNotEmpty({ message: 'unitId wajib diisi (unit penerima)' })
  unitId: string;
}

export class ConfirmReceivingItemDto {
  @ApiProperty({ example: 'receiving-item-id' })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ example: 48 })
  @IsInt()
  @Min(0)
  qtyReceived: number;
}

export class ConfirmReceivingDto {
  @ApiProperty({ type: [ConfirmReceivingItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ConfirmReceivingItemDto)
  items: ConfirmReceivingItemDto[];
}

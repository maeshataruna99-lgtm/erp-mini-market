import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { Role } from '@prisma/client';

export class CreateUserDto {
  @ApiProperty({ example: 'Staff Baru' })
  @IsString()
  @IsNotEmpty({ message: 'Nama wajib diisi' })
  name: string;

  @ApiProperty({ example: 'staff@minierp.id' })
  @IsString()
  @IsNotEmpty({ message: 'Email wajib diisi' })
  email: string;

  @ApiProperty({ example: 'admin123' })
  @IsString()
  @IsNotEmpty({ message: 'Password wajib diisi' })
  @MinLength(6, { message: 'Password minimal 6 karakter' })
  password: string;

  @ApiProperty({ enum: Role, default: Role.STAFF_KASIR })
  @IsEnum(Role, { message: 'Role tidak valid' })
  role: Role;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  unitId?: string;
}

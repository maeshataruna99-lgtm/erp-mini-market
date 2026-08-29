import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ReceivingService } from './receiving.service';
import { ConfirmReceivingDto, CreateReceivingDto } from './dto/receiving.dto';

@ApiTags('Transaction - Goods Receiving')
@ApiBearerAuth()
@Controller('receiving')
export class ReceivingController {
  constructor(private readonly receivingService: ReceivingService) {}

  @Post()
  @ApiOperation({ summary: 'Buat sesi penerimaan dari PO (harus SENT)' })
  create(@Body() dto: CreateReceivingDto, @CurrentUser() user: AuthUser) {
    return this.receivingService.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Daftar penerimaan' })
  findAll(@Query() query: { page?: number; limit?: number; search?: string }) {
    return this.receivingService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detail penerimaan' })
  findOne(@Param('id') id: string) {
    return this.receivingService.findOne(id);
  }

  @Post(':id/confirm')
  @ApiOperation({ summary: 'Konfirmasi qty fisik → update stok (transaksi atomik)' })
  confirm(@Param('id') id: string, @Body() dto: ConfirmReceivingDto, @CurrentUser() user: AuthUser) {
    return this.receivingService.confirm(id, dto, user);
  }
}

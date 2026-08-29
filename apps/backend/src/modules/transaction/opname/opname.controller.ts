import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OpnameStatus } from '@prisma/client';
import { AuthUser, CurrentUser } from '../../../common/decorators/current-user.decorator';
import { OpnameService } from './opname.service';
import { BlindCountDto, CreateOpnameSessionDto } from './dto/opname.dto';

@ApiTags('Transaction - Stock Opname')
@ApiBearerAuth()
@Controller('opname/sessions')
export class OpnameController {
  constructor(private readonly opnameService: OpnameService) {}

  @Post()
  @ApiOperation({ summary: 'Buat sesi opname' })
  create(@Body() dto: CreateOpnameSessionDto, @CurrentUser() user: AuthUser) {
    return this.opnameService.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Daftar sesi opname' })
  findAll(@Query() query: { page?: number; limit?: number; status?: OpnameStatus; search?: string }) {
    return this.opnameService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detail sesi opname + items' })
  findOne(@Param('id') id: string) {
    return this.opnameService.findOne(id);
  }

  @Post(':id/start')
  @ApiOperation({ summary: 'Mulai sesi → IN_PROGRESS + generate items produk' })
  start(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.opnameService.start(id, user);
  }

  @Post(':id/blind-count')
  @ApiOperation({ summary: 'Submit blind count (qty fisik, tanpa qty sistem)' })
  blindCount(
    @Param('id') id: string,
    @Body() dto: BlindCountDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.opnameService.blindCount(id, dto, user);
  }

  @Post(':id/reconcile')
  @ApiOperation({ summary: 'Reconcile + adjust stok (transaksi atomik)' })
  reconcile(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.opnameService.reconcile(id, user);
  }

  @Post(':id/close')
  @ApiOperation({ summary: 'Tutup sesi opname' })
  close(@Param('id') id: string) {
    return this.opnameService.close(id);
  }
}

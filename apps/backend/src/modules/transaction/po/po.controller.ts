import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AuthUser, CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { PoService } from './po.service';
import { CreatePoDto, QueryPoDto } from './dto/po.dto';

@ApiTags('Transaction - Purchase Order')
@ApiBearerAuth()
@Controller('po')
export class PoController {
  constructor(private readonly poService: PoService) {}

  @Post()
  @ApiOperation({ summary: 'Buat PO baru (status DRAFT)' })
  create(@Body() dto: CreatePoDto, @CurrentUser() user: AuthUser) {
    return this.poService.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Daftar PO (pagination, search, filter status)' })
  findAll(@Query() query: QueryPoDto) {
    return this.poService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detail PO + items + receiving' })
  findOne(@Param('id') id: string) {
    return this.poService.findOne(id);
  }

  @Patch(':id/submit')
  @ApiOperation({ summary: 'Submit PO → PENDING_APPROVAL' })
  submit(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.poService.submit(id, user);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.MANAGER, Role.ADMIN)
  @Patch(':id/approve')
  @ApiOperation({ summary: 'Approve PO (MANAGER/ADMIN)' })
  approve(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.poService.approve(id, user);
  }

  @Patch(':id/send')
  @ApiOperation({ summary: 'Tandai PO dikirim ke supplier → SENT' })
  send(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.poService.send(id, user);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Batalkan PO (DRAFT/PENDING_APPROVAL)' })
  cancel(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.poService.cancel(id, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Hapus PO (hanya DRAFT)' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.poService.remove(id, user);
  }
}

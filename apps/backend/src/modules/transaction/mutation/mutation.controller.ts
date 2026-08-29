import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MutationStatus, Role } from '@prisma/client';
import { AuthUser, CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { MutationService } from './mutation.service';
import { CreateMutationDto } from './dto/mutation.dto';

@ApiTags('Transaction - Stock Mutation')
@ApiBearerAuth()
@Controller('mutations')
export class MutationController {
  constructor(private readonly mutationService: MutationService) {}

  @Post()
  @ApiOperation({ summary: 'Request mutasi antar unit' })
  create(@Body() dto: CreateMutationDto, @CurrentUser() user: AuthUser) {
    return this.mutationService.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Daftar mutasi (filter status)' })
  findAll(@Query() query: { page?: number; limit?: number; status?: MutationStatus }) {
    return this.mutationService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detail mutasi' })
  findOne(@Param('id') id: string) {
    return this.mutationService.findOne(id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.MANAGER, Role.ADMIN)
  @Patch(':id/approve')
  @ApiOperation({ summary: 'Approve mutasi (MANAGER/ADMIN)' })
  approve(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.mutationService.approve(id, user);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.MANAGER, Role.ADMIN)
  @Patch(':id/reject')
  @ApiOperation({ summary: 'Tolak mutasi (MANAGER/ADMIN)' })
  reject(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.mutationService.reject(id, user);
  }

  @Patch(':id/pick')
  @ApiOperation({ summary: 'Pick barang → IN_TRANSIT' })
  pick(@Param('id') id: string) {
    return this.mutationService.pick(id);
  }

  @Patch(':id/receive')
  @ApiOperation({ summary: 'Konfirmasi terima → kurangi unit asal, tambah unit tujuan (atomik)' })
  receive(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.mutationService.receive(id, user);
  }
}

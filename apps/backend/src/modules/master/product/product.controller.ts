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
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ProductService } from './product.service';
import {
  CreateProductBatchDto,
  CreateProductDto,
  QueryProductDto,
  UpdateProductDto,
} from './dto/product.dto';

@ApiTags('Master - Product')
@ApiBearerAuth()
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  @ApiOperation({ summary: 'Daftar produk (pagination, search, filter stok)' })
  findAll(@Query() query: QueryProductDto) {
    return this.productService.findAll(query);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Daftar kategori unik' })
  findCategories() {
    return this.productService.findCategories();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detail produk + stok per unit + batch' })
  findOne(@Param('id') id: string) {
    return this.productService.findOne(id);
  }

  @Get(':id/batches')
  @ApiOperation({ summary: 'Daftar batch/FEFO produk' })
  listBatches(@Param('id') id: string) {
    return this.productService.listBatches(id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @Post()
  @ApiOperation({ summary: 'Buat produk (ADMIN/MANAGER)' })
  create(@Body() dto: CreateProductDto) {
    return this.productService.create(dto);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @Post(':id/batches')
  @ApiOperation({ summary: 'Tambah batch produk (ADMIN/MANAGER)' })
  addBatch(@Param('id') id: string, @Body() dto: CreateProductBatchDto) {
    return this.productService.addBatch(id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @Patch(':id')
  @ApiOperation({ summary: 'Update produk (ADMIN/MANAGER)' })
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productService.update(id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Delete(':id')
  @ApiOperation({ summary: 'Hapus produk (ADMIN)' })
  remove(@Param('id') id: string) {
    return this.productService.remove(id);
  }
}

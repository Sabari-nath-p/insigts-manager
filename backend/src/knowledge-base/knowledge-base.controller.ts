import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Res, StreamableFile, UploadedFile, UseGuards, UseInterceptors, } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { KnowledgeBaseService } from './knowledge-base.service';
import { SaveKnowledgeResourceDto } from './dto/save-knowledge-resource.dto';
import { UpdateKnowledgeResourceDto } from './dto/update-knowledge-resource.dto';
import { UploadKnowledgeResourceDto } from './dto/upload-knowledge-resource.dto';

const MAX_FILE_BYTES = 20 * 1024 * 1024;

@ApiTags('knowledge-base')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('knowledge-base/resources')
export class KnowledgeBaseController {
  constructor(private readonly knowledgeBaseService: KnowledgeBaseService) {}

  @Get()
  list(@CurrentUser() user: { userId: string }) {
    return this.knowledgeBaseService.listForUser(user.userId);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.super_admin)
  @Post()
  create(@CurrentUser() user: { userId: string }, @Body() dto: SaveKnowledgeResourceDto) {
    return this.knowledgeBaseService.create(user.userId, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.super_admin)
  @ApiConsumes('multipart/form-data')
  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_FILE_BYTES } }))
  createFromUpload(
    @CurrentUser() user: { userId: string },
    @Body() dto: UploadKnowledgeResourceDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.knowledgeBaseService.createFromUpload(user.userId, dto, file);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.super_admin)
  @Patch(':id')
  update(@CurrentUser() user: { userId: string }, @Param('id') id: string, @Body() dto: UpdateKnowledgeResourceDto) {
    return this.knowledgeBaseService.update(user.userId, id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.super_admin)
  @ApiConsumes('multipart/form-data')
  @Post(':id/replace-file')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_FILE_BYTES } }))
  replaceFile(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.knowledgeBaseService.replaceFile(user.userId, id, file);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.super_admin)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.knowledgeBaseService.remove(id);
  }

  @Get(':id/file')
  async getFile(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Query('download') download: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { fileName, fileMimeType, fileData } = await this.knowledgeBaseService.getFileForUser(user.userId, id);
    res.set({
      'Content-Type': fileMimeType,
      'Content-Disposition': `${download === 'true' ? 'attachment' : 'inline'}; filename="${encodeURIComponent(fileName)}"`,
      'Content-Length': fileData.length.toString(),
    });
    return new StreamableFile(fileData);
  }
}

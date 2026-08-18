import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Res, StreamableFile, UploadedFile, UseGuards, UseInterceptors, } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { ClientContactDto } from './dto/client-contact.dto';
import { SaveClientTeamMemberDto } from './dto/client-team-member.dto';
import { SaveClientServiceDto } from './dto/client-service.dto';
import { SaveClientGoalDto } from './dto/client-goal.dto';
import { CreateClientAssetLinkDto, UploadClientAssetDto } from './dto/client-asset.dto';
import { UploadClientDocumentDto } from './dto/client-document.dto';
import { SaveClientLinkDto } from './dto/client-link.dto';
import { SaveClientNoteDto } from './dto/client-note.dto';
import { SaveClientMeetingDto } from './dto/client-meeting.dto';

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

type ReqUser = { userId: string; role: UserRole };

@ApiTags('clients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  // --- Core ---

  @Get()
  list(@CurrentUser() user: ReqUser) {
    return this.clientsService.listForUser(user.userId);
  }

  @Get('mine')
  listMine(@CurrentUser() user: ReqUser) {
    return this.clientsService.listMine(user.userId);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.super_admin)
  @Post()
  create(@CurrentUser() user: ReqUser, @Body() dto: CreateClientDto) {
    return this.clientsService.create(user.userId, dto);
  }

  @Get(':id')
  detail(@CurrentUser() user: ReqUser, @Param('id') id: string) {
    return this.clientsService.getDetail(id, user.userId);
  }

  @Patch(':id')
  update(@CurrentUser() user: ReqUser, @Param('id') id: string, @Body() dto: UpdateClientDto) {
    return this.clientsService.update(id, user.userId, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.super_admin)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.clientsService.remove(id);
  }

  @Post(':id/logo')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES } }))
  uploadLogo(@CurrentUser() user: ReqUser, @Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    return this.clientsService.uploadLogo(id, user.userId, file);
  }

  @Get(':id/logo')
  async getLogo(@CurrentUser() user: ReqUser, @Param('id') id: string, @Res({ passthrough: true }) res: Response) {
    const { mimeType, data } = await this.clientsService.getLogo(id, user.userId);
    res.set({ 'Content-Type': mimeType, 'Content-Length': data.length.toString() });
    return new StreamableFile(data);
  }

  // --- Contacts ---

  @Get(':id/contacts')
  listContacts(@CurrentUser() user: ReqUser, @Param('id') id: string) {
    return this.clientsService.listContacts(id, user.userId);
  }

  @Post(':id/contacts')
  addContact(@CurrentUser() user: ReqUser, @Param('id') id: string, @Body() dto: ClientContactDto) {
    return this.clientsService.addContact(id, user.userId, dto);
  }

  @Patch(':id/contacts/:contactId')
  updateContact(@CurrentUser() user: ReqUser, @Param('id') id: string, @Param('contactId') contactId: string, @Body() dto: ClientContactDto) {
    return this.clientsService.updateContact(id, contactId, user.userId, dto);
  }

  @Delete(':id/contacts/:contactId')
  removeContact(@CurrentUser() user: ReqUser, @Param('id') id: string, @Param('contactId') contactId: string) {
    return this.clientsService.removeContact(id, contactId, user.userId);
  }

  // --- Team ---

  @Get(':id/team')
  listTeam(@CurrentUser() user: ReqUser, @Param('id') id: string) {
    return this.clientsService.listTeam(id, user.userId);
  }

  @Post(':id/team')
  assignTeamMember(@CurrentUser() user: ReqUser, @Param('id') id: string, @Body() dto: SaveClientTeamMemberDto) {
    return this.clientsService.assignTeamMember(id, user.userId, dto);
  }

  @Patch(':id/team/:memberId')
  updateTeamMember(@CurrentUser() user: ReqUser, @Param('id') id: string, @Param('memberId') memberId: string, @Body() dto: SaveClientTeamMemberDto) {
    return this.clientsService.updateTeamMember(id, memberId, user.userId, dto);
  }

  @Delete(':id/team/:memberId')
  removeTeamMember(@CurrentUser() user: ReqUser, @Param('id') id: string, @Param('memberId') memberId: string) {
    return this.clientsService.removeTeamMember(id, memberId, user.userId);
  }

  // --- Services ---

  @Get(':id/services')
  listServices(@CurrentUser() user: ReqUser, @Param('id') id: string) {
    return this.clientsService.listServices(id, user.userId);
  }

  @Post(':id/services')
  addService(@CurrentUser() user: ReqUser, @Param('id') id: string, @Body() dto: SaveClientServiceDto) {
    return this.clientsService.addService(id, user.userId, dto);
  }

  @Patch(':id/services/:serviceId')
  updateService(@CurrentUser() user: ReqUser, @Param('id') id: string, @Param('serviceId') serviceId: string, @Body() dto: SaveClientServiceDto) {
    return this.clientsService.updateService(id, serviceId, user.userId, dto);
  }

  @Delete(':id/services/:serviceId')
  removeService(@CurrentUser() user: ReqUser, @Param('id') id: string, @Param('serviceId') serviceId: string) {
    return this.clientsService.removeService(id, serviceId, user.userId);
  }

  // --- Goals ---

  @Get(':id/goals')
  listGoals(@CurrentUser() user: ReqUser, @Param('id') id: string) {
    return this.clientsService.listGoals(id, user.userId);
  }

  @Post(':id/goals')
  addGoal(@CurrentUser() user: ReqUser, @Param('id') id: string, @Body() dto: SaveClientGoalDto) {
    return this.clientsService.addGoal(id, user.userId, dto);
  }

  @Patch(':id/goals/:goalId')
  updateGoal(@CurrentUser() user: ReqUser, @Param('id') id: string, @Param('goalId') goalId: string, @Body() dto: SaveClientGoalDto) {
    return this.clientsService.updateGoal(id, goalId, user.userId, dto);
  }

  @Delete(':id/goals/:goalId')
  removeGoal(@CurrentUser() user: ReqUser, @Param('id') id: string, @Param('goalId') goalId: string) {
    return this.clientsService.removeGoal(id, goalId, user.userId);
  }

  // --- Assets ---

  @Get(':id/assets')
  listAssets(@CurrentUser() user: ReqUser, @Param('id') id: string) {
    return this.clientsService.listAssets(id, user.userId);
  }

  @Post(':id/assets/link')
  addAssetLink(@CurrentUser() user: ReqUser, @Param('id') id: string, @Body() dto: CreateClientAssetLinkDto) {
    return this.clientsService.addAssetLink(id, user.userId, dto);
  }

  @Post(':id/assets/upload')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES } }))
  uploadAsset(@CurrentUser() user: ReqUser, @Param('id') id: string, @Body() dto: UploadClientAssetDto, @UploadedFile() file: Express.Multer.File) {
    return this.clientsService.uploadAsset(id, user.userId, dto, file);
  }

  @Delete(':id/assets/:assetId')
  removeAsset(@CurrentUser() user: ReqUser, @Param('id') id: string, @Param('assetId') assetId: string) {
    return this.clientsService.removeAsset(id, assetId, user.userId);
  }

  @Get(':id/assets/:assetId/file')
  async getAssetFile(
    @CurrentUser() user: ReqUser,
    @Param('id') id: string,
    @Param('assetId') assetId: string,
    @Query('download') download: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { fileName, fileMimeType, fileData } = await this.clientsService.getAssetFile(id, assetId, user.userId);
    res.set({
      'Content-Type': fileMimeType,
      'Content-Disposition': `${download === 'true' ? 'attachment' : 'inline'}; filename="${encodeURIComponent(fileName)}"`,
      'Content-Length': fileData.length.toString(),
    });
    return new StreamableFile(fileData);
  }

  // --- Documents ---

  @Get(':id/documents')
  listDocuments(@CurrentUser() user: ReqUser, @Param('id') id: string) {
    return this.clientsService.listDocuments(id, user.userId);
  }

  @Post(':id/documents')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES } }))
  uploadDocument(@CurrentUser() user: ReqUser, @Param('id') id: string, @Body() dto: UploadClientDocumentDto, @UploadedFile() file: Express.Multer.File) {
    return this.clientsService.uploadDocument(id, user.userId, dto, file);
  }

  @Delete(':id/documents/:documentId')
  removeDocument(@CurrentUser() user: ReqUser, @Param('id') id: string, @Param('documentId') documentId: string) {
    return this.clientsService.removeDocument(id, documentId, user.userId);
  }

  @Get(':id/documents/:documentId/file')
  async getDocumentFile(
    @CurrentUser() user: ReqUser,
    @Param('id') id: string,
    @Param('documentId') documentId: string,
    @Query('download') download: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { fileName, fileMimeType, fileData } = await this.clientsService.getDocumentFile(id, documentId, user.userId);
    res.set({
      'Content-Type': fileMimeType,
      'Content-Disposition': `${download === 'true' ? 'attachment' : 'inline'}; filename="${encodeURIComponent(fileName)}"`,
      'Content-Length': fileData.length.toString(),
    });
    return new StreamableFile(fileData);
  }

  // --- Links ---

  @Get(':id/links')
  listLinks(@CurrentUser() user: ReqUser, @Param('id') id: string) {
    return this.clientsService.listLinks(id, user.userId);
  }

  @Post(':id/links')
  addLink(@CurrentUser() user: ReqUser, @Param('id') id: string, @Body() dto: SaveClientLinkDto) {
    return this.clientsService.addLink(id, user.userId, dto);
  }

  @Delete(':id/links/:linkId')
  removeLink(@CurrentUser() user: ReqUser, @Param('id') id: string, @Param('linkId') linkId: string) {
    return this.clientsService.removeLink(id, linkId, user.userId);
  }

  // --- Notes ---

  @Get(':id/notes')
  listNotes(@CurrentUser() user: ReqUser, @Param('id') id: string) {
    return this.clientsService.listNotes(id, user.userId);
  }

  @Post(':id/notes')
  addNote(@CurrentUser() user: ReqUser, @Param('id') id: string, @Body() dto: SaveClientNoteDto) {
    return this.clientsService.addNote(id, user.userId, dto);
  }

  @Patch(':id/notes/:noteId')
  updateNote(@CurrentUser() user: ReqUser, @Param('id') id: string, @Param('noteId') noteId: string, @Body() dto: SaveClientNoteDto) {
    return this.clientsService.updateNote(id, noteId, user.userId, dto);
  }

  @Delete(':id/notes/:noteId')
  removeNote(@CurrentUser() user: ReqUser, @Param('id') id: string, @Param('noteId') noteId: string) {
    return this.clientsService.removeNote(id, noteId, user.userId);
  }

  // --- Meetings ---

  @Get(':id/meetings')
  listMeetings(@CurrentUser() user: ReqUser, @Param('id') id: string) {
    return this.clientsService.listMeetings(id, user.userId);
  }

  @Post(':id/meetings')
  addMeeting(@CurrentUser() user: ReqUser, @Param('id') id: string, @Body() dto: SaveClientMeetingDto) {
    return this.clientsService.addMeeting(id, user.userId, dto);
  }

  @Patch(':id/meetings/:meetingId')
  updateMeeting(@CurrentUser() user: ReqUser, @Param('id') id: string, @Param('meetingId') meetingId: string, @Body() dto: SaveClientMeetingDto) {
    return this.clientsService.updateMeeting(id, meetingId, user.userId, dto);
  }

  @Delete(':id/meetings/:meetingId')
  removeMeeting(@CurrentUser() user: ReqUser, @Param('id') id: string, @Param('meetingId') meetingId: string) {
    return this.clientsService.removeMeeting(id, meetingId, user.userId);
  }

  // --- Activity ---

  @Get(':id/activity')
  listActivity(@CurrentUser() user: ReqUser, @Param('id') id: string) {
    return this.clientsService.listActivity(id, user.userId);
  }
}

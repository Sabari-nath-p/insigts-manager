import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { IsArray, IsNumber, IsOptional, IsString } from 'class-validator';
import { CreateClientDto } from './create-client.dto';

// Contacts have their own CRUD (POST/PATCH/DELETE /clients/:id/contacts) — not edited here.
export class UpdateClientDto extends PartialType(OmitType(CreateClientDto, ['contacts'] as const)) {
  // --- About / business ---
  @ApiPropertyOptional() @IsOptional() @IsString() mission?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() vision?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() coreValues?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() targetAudiencePrimary?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() targetAudienceSecondary?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() targetAudienceAgeGroup?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() targetAudienceLocation?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() targetAudienceInterests?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() targetAudiencePainPoints?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() targetAudienceBuyingBehavior?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() businessModel?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() productsServices?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() keyDifferentiators?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() founded?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() companySize?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() locations?: string;

  // --- Brand ---
  @ApiPropertyOptional() @IsOptional() @IsString() brandName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() tagline?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() brandDescription?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() brandPersonality?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() brandVoice?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() toneOfVoice?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() communicationStyle?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) primaryColors?: string[];
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) secondaryColors?: string[];
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) accentColors?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() headingFont?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bodyFont?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() logoUsageRules?: string;

  // --- Preferences ---
  @ApiPropertyOptional() @IsOptional() @IsString() preferredCommunicationMethod?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() preferredMeetingTime?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() preferredContentStyle?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() preferredColors?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() thingsToAvoid?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() approvalProcess?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reportingPreferences?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() specialRequirements?: string;

  // --- Retainer (financial) ---
  @ApiPropertyOptional() @IsOptional() @IsNumber() retainerValue?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() retainerPackage?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() renewalDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() retainerNotes?: string;

  // --- Current work (markdown) ---
  @ApiPropertyOptional() @IsOptional() @IsString() currentPriority?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() currentStrategy?: string;
}

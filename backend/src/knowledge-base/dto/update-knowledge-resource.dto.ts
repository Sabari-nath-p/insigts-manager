import { OmitType, PartialType } from '@nestjs/swagger';
import { SaveKnowledgeResourceDto } from './save-knowledge-resource.dto';

// `type` is fixed at creation — switching a resource between document/file/link
// afterwards is not a supported flow (each type carries different required fields).
export class UpdateKnowledgeResourceDto extends PartialType(
  OmitType(SaveKnowledgeResourceDto, ['type'] as const),
) {}

import { PmColumnType, PmMemberRole, PmPriority } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsHexColor,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export class CreateProjectDto {
  @IsString() @IsNotEmpty() @MaxLength(100) name!: string;
  @Matches(/^[A-Z][A-Z0-9]{1,9}$/, { message: 'Key must be 2-10 uppercase letters or digits' }) key!: string;
  @IsOptional() @IsHexColor() color?: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
}

export class UpdateProjectDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(100) name?: string;
  @IsOptional() @IsHexColor() color?: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
}

export class CreateColumnDto {
  @IsString() @IsNotEmpty() @MaxLength(60) name!: string;
  @IsEnum(PmColumnType) type!: PmColumnType;
}

export class UpdateColumnDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(60) name?: string;
  /** Move the column right after this column id; send an empty string to move it to the front. */
  @IsOptional() @IsString() afterColumnId?: string;
}

export class CreateLabelDto {
  @IsString() @IsNotEmpty() @MaxLength(40) name!: string;
  @IsOptional() @IsHexColor() color?: string;
}

export class CreateTaskDto {
  @IsString() @IsNotEmpty() @MaxLength(300) title!: string;
  @IsOptional() @IsUUID() columnId?: string;
  @IsOptional() @IsString() @MaxLength(20000) description?: string;
  @IsOptional() @IsEnum(PmPriority) priority?: PmPriority;
  /** Everyone starting on the task. Leave out for an unassigned task. */
  @IsOptional() @IsArray() @ArrayMaxSize(20) @IsUUID('all', { each: true }) assigneeIds?: string[];
  @IsOptional() @Matches(DATE_RE) dueDate?: string;
  @IsOptional() @IsArray() @IsUUID('all', { each: true }) labelIds?: string[];
}

export class UpdateTaskDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(300) title?: string;
  @IsOptional() @IsString() @MaxLength(20000) description?: string;
  @IsOptional() @IsEnum(PmPriority) priority?: PmPriority;
  /** The full set of assignees. It replaces the current set and may not be empty. */
  @IsOptional() @IsArray() @ArrayMaxSize(20) @IsUUID('all', { each: true }) assigneeIds?: string[];
  /** null clears the due date. */
  @IsOptional() dueDate?: string | null;
  @IsOptional() @IsArray() @IsUUID('all', { each: true }) labelIds?: string[];
}

export class MoveTaskDto {
  @IsUUID() columnId!: string;
  /** Task the moved card should sit directly below; omit to place it at the top of the column. */
  @IsOptional() @IsUUID() afterTaskId?: string;
}

export class PostUpdateDto {
  @IsString() @IsNotEmpty() @MaxLength(5000) body!: string;
}

export class SetAccessDto {
  @IsEnum(PmMemberRole) role!: PmMemberRole;
  @IsBoolean() revoked!: boolean;
}

export class BoardQueryDto {
  @IsOptional() @IsString() assignee?: string; // user id | 'me' | 'none'
  @IsOptional() @IsEnum(PmPriority) priority?: PmPriority;
  @IsOptional() @IsString() label?: string;
  @IsOptional() @IsString() due?: string; // overdue | week
  @IsOptional() @IsString() q?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) offset?: number;
}

export class InsightsQueryDto {
  @IsOptional() @IsString() range?: string;
  @IsOptional() @IsString() from?: string;
  @IsOptional() @IsString() to?: string;
  @IsOptional() @IsString() project?: string; // project key
  @IsOptional() @IsString() member?: string; // user id
}

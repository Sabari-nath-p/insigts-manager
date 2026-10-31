import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min, ValidateNested } from 'class-validator';

export class CreateCalendarDto {
  @IsString() @IsNotEmpty() @MaxLength(100) client!: string;
  @IsInt() @Min(2000) @Max(2200) year!: number;
  /** 0-11, like JavaScript's Date#getMonth(). */
  @IsInt() @Min(0) @Max(11) month!: number;
}

export class UpdateCalendarDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(100) client?: string;
  @IsOptional() @IsInt() @Min(2000) @Max(2200) year?: number;
  @IsOptional() @IsInt() @Min(0) @Max(11) month?: number;
}

export class PostDto {
  @IsString() @IsNotEmpty() @MaxLength(64) id!: string;
  @IsString() @IsNotEmpty() @MaxLength(60) type!: string;
  @IsString() @MaxLength(1000) note!: string;
}

export class MarkerDto {
  @IsString() @IsNotEmpty() @MaxLength(60) label!: string;
}

/** Everything planned for one day. It replaces that day completely. */
export class SaveDayDto {
  @IsArray() @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => PostDto) posts!: PostDto[];
  @IsOptional() @ValidateNested() @Type(() => MarkerDto) marker?: MarkerDto | null;
}

export class SetEditorDto {
  @IsBoolean() canEdit!: boolean;
}

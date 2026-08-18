import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsUUID, Max, Min, ValidateIf } from 'class-validator';
import { CommissionRuleScope, CommissionSalesRole } from '@prisma/client';

export class SaveCommissionRuleDto {
  @ApiProperty({ enum: CommissionRuleScope })
  @IsEnum(CommissionRuleScope)
  scope: CommissionRuleScope;

  @ApiPropertyOptional({ enum: CommissionSalesRole, description: 'Required when scope = role' })
  @ValidateIf((o) => o.scope === CommissionRuleScope.role)
  @IsEnum(CommissionSalesRole)
  salesRole?: CommissionSalesRole;

  @ApiPropertyOptional({ description: 'Required when scope = employee' })
  @ValidateIf((o) => o.scope === CommissionRuleScope.employee)
  @IsUUID()
  userId?: string;

  @ApiProperty({ example: 10 })
  @IsNumber()
  @Min(0)
  @Max(100)
  percent: number;
}

import { Module } from '@nestjs/common';
import { ClientsModule } from '../clients/clients.module';
import { CrmService } from './crm.service';
import { CrmController } from './crm.controller';

@Module({
  imports: [ClientsModule],
  controllers: [CrmController],
  providers: [CrmService],
  exports: [CrmService],
})
export class CrmModule {}

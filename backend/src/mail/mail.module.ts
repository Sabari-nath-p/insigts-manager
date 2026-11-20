import { Module } from '@nestjs/common';
import { AssignmentMailer } from './assignment-mailer.service';
import { MailService } from './mail.service';

/** Outgoing email. Off until the SMTP settings are in the environment. */
@Module({
  providers: [MailService, AssignmentMailer],
  exports: [AssignmentMailer],
})
export class MailModule {}

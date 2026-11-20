import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';

export interface OutgoingMail {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/**
 * Sends email through any SMTP server (set up for Brevo). All settings come from the environment, so no password
 * ever lives in the code. When they are not all set, email is simply off: nothing is sent and nothing breaks.
 * Sending never throws, so a mail problem can not fail the action that caused it.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter | null = null;
  private readonly from: string = '';

  /** True when the SMTP settings are complete. */
  readonly enabled: boolean;
  /** The website's public address, used for the links inside emails. Null when not set. */
  readonly appUrl: string | null;

  constructor(config: ConfigService) {
    const host = config.get<string>('SMTP_HOST');
    const user = config.get<string>('SMTP_USER');
    const pass = config.get<string>('SMTP_PASS');
    const from = config.get<string>('MAIL_FROM');
    const port = Number(config.get<string>('SMTP_PORT') || 587);
    const appUrl = (config.get<string>('APP_URL') || '').trim().replace(/\/+$/, '');
    this.appUrl = /^https?:\/\//i.test(appUrl) ? appUrl : null;

    this.enabled = !!(host && user && pass && from);
    if (!this.enabled) {
      this.logger.log('Email is off: set SMTP_HOST, SMTP_USER, SMTP_PASS and MAIL_FROM to turn on assignment emails.');
      return;
    }
    this.from = from as string;
    this.transporter = createTransport({
      host,
      port,
      // Port 465 is encrypted from the start; the usual 587 starts plain and then switches to TLS.
      secure: port === 465,
      requireTLS: port !== 465,
      auth: { user, pass },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });
    this.logger.log(`Email is on (SMTP ${host}:${port}).`);
  }

  /** Returns true when the server accepted the email. A failure is logged and swallowed. */
  async send(mail: OutgoingMail): Promise<boolean> {
    if (!this.transporter) return false;
    try {
      await this.transporter.sendMail({ from: this.from, to: mail.to, subject: mail.subject, text: mail.text, html: mail.html });
      return true;
    } catch (e) {
      this.logger.warn(`Email could not be sent: ${(e as Error).message}`);
      return false;
    }
  }
}

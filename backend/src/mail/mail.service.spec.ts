import { MailService } from './mail.service';

const sendMail = jest.fn();
jest.mock('nodemailer', () => ({ createTransport: jest.fn(() => ({ sendMail })) }));

const config = (env: Record<string, string>) => ({ get: (k: string) => env[k] }) as never;
const FULL = { SMTP_HOST: 'smtp.test.example', SMTP_USER: 'login@test.example', SMTP_PASS: 'not-a-real-key', MAIL_FROM: 'Insights <noreply@test.example>', APP_URL: 'https://insights.example.com/' };
const mail = { to: 'someone@test.example', subject: 's', text: 't', html: '<p>t</p>' };

describe('mail service', () => {
  beforeEach(() => sendMail.mockReset());

  it('is off, and sends nothing, unless every setting is there', async () => {
    for (const missing of ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'MAIL_FROM']) {
      const { [missing]: _omit, ...rest } = FULL as Record<string, string>;
      const service = new MailService(config(rest));
      expect(service.enabled).toBe(false);
      expect(await service.send(mail)).toBe(false);
    }
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('sends from the configured sender when it is on', async () => {
    sendMail.mockResolvedValue({});
    const service = new MailService(config(FULL));

    expect(service.enabled).toBe(true);
    expect(await service.send(mail)).toBe(true);
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ from: 'Insights <noreply@test.example>', to: 'someone@test.example' }));
  });

  it('never throws when the mail server refuses: it reports false', async () => {
    sendMail.mockRejectedValue(new Error('535 authentication failed'));
    const service = new MailService(config(FULL));

    await expect(service.send(mail)).resolves.toBe(false);
  });

  it('tidies the website address, and ignores one that is not a web address', () => {
    expect(new MailService(config(FULL)).appUrl).toBe('https://insights.example.com');
    expect(new MailService(config({ ...FULL, APP_URL: 'not a url' })).appUrl).toBeNull();
    expect(new MailService(config({ ...FULL, APP_URL: '' })).appUrl).toBeNull();
  });
});

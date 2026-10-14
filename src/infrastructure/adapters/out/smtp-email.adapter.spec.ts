import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SmtpEmailAdapter } from './smtp-email.adapter';

describe('SmtpEmailAdapter', () => {
  let adapter: SmtpEmailAdapter;
  let configServiceMock: Partial<ConfigService>;
  let sendMailMock: jest.Mock;

  beforeEach(async () => {
    configServiceMock = {
      get: jest.fn((key: string, defaultValue?: any) => {
        const config: Record<string, any> = {
          SMTP_HOST: 'smtp.test.com',
          SMTP_PORT: 587,
          SMTP_SECURE: 'false',
          SMTP_USER: 'test@test.com',
          SMTP_PASS: 'password',
          SMTP_FROM_ADDRESS: 'notifier@test.com',
          SMTP_FROM_NAME: 'Test System',
        };
        return config[key] ?? defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SmtpEmailAdapter,
        {
          provide: ConfigService,
          useValue: configServiceMock,
        },
      ],
    }).compile();

    adapter = module.get<SmtpEmailAdapter>(SmtpEmailAdapter);

    sendMailMock = jest.fn().mockResolvedValue({ messageId: 'msg-123' });
    adapter.setTransporter({
      sendMail: sendMailMock,
    } as any);
  });

  it('should be defined', () => {
    expect(adapter).toBeDefined();
  });

  it('should format and send email using transporter', async () => {
    await adapter.sendWelcomeEmail('recipient@example.com', 'Maria');

    expect(sendMailMock).toHaveBeenCalledTimes(1);
    const mailOptions = sendMailMock.mock.calls[0][0];

    expect(mailOptions.to).toBe('recipient@example.com');
    expect(mailOptions.from).toContain('notifier@test.com');
    expect(mailOptions.from).toContain('Test System');
    expect(mailOptions.subject).toContain('Maria');
    expect(mailOptions.html).toContain('Maria');
  });

  it('should rethrow errors when transporter.sendMail fails', async () => {
    sendMailMock.mockRejectedValueOnce(new Error('Network error'));

    await expect(adapter.sendWelcomeEmail('recipient@example.com', 'Maria')).rejects.toThrow('Network error');
  });
});

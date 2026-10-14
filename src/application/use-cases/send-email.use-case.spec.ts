import { Test, TestingModule } from '@nestjs/testing';
import { SendEmailUseCase } from './send-email.use-case';
import { EMAIL_SENDER_PORT, EmailSenderPort } from '../../domain/ports/email-sender.port';

describe('SendEmailUseCase', () => {
  let useCase: SendEmailUseCase;
  let sendWelcomeEmailMock: jest.Mock;
  let emailSenderMock: EmailSenderPort;

  beforeEach(async () => {
    sendWelcomeEmailMock = jest.fn().mockResolvedValue(undefined);
    emailSenderMock = {
      sendWelcomeEmail: sendWelcomeEmailMock,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SendEmailUseCase,
        {
          provide: EMAIL_SENDER_PORT,
          useValue: emailSenderMock,
        },
      ],
    }).compile();

    useCase = module.get<SendEmailUseCase>(SendEmailUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should call sendWelcomeEmail on EmailSenderPort with trimmed values', async () => {
    const email = '  user@example.com  ';
    const name = '  John Doe  ';

    await useCase.sendWelcomeEmail(email, name);

    expect(sendWelcomeEmailMock).toHaveBeenCalledTimes(1);
    expect(sendWelcomeEmailMock).toHaveBeenCalledWith('user@example.com', 'John Doe');
  });

  it('should fallback to default name "Usuario" if name is missing or empty', async () => {
    await useCase.sendWelcomeEmail('user@example.com', '');

    expect(sendWelcomeEmailMock).toHaveBeenCalledWith('user@example.com', 'Usuario');
  });

  it('should not call emailSender if email is empty or invalid', async () => {
    await useCase.sendWelcomeEmail('   ', 'John Doe');

    expect(sendWelcomeEmailMock).not.toHaveBeenCalled();
  });

  it('should propagate errors thrown by the emailSender adapter', async () => {
    sendWelcomeEmailMock.mockRejectedValueOnce(new Error('SMTP connection failed'));

    await expect(useCase.sendWelcomeEmail('user@example.com', 'John')).rejects.toThrow('SMTP connection failed');
  });
});

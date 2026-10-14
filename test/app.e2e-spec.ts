import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { KafkaConsumerController } from '../src/infrastructure/adapters/in/kafka-consumer.controller';
import { SendEmailUseCase } from '../src/application/use-cases/send-email.use-case';
import { EMAIL_SENDER_PORT, EmailSenderPort } from '../src/domain/ports/email-sender.port';

describe('NotifiersService (Integration)', () => {
  let moduleRef: TestingModule;
  let controller: KafkaConsumerController;
  let sendEmailUseCase: SendEmailUseCase;
  let sendWelcomeEmailMock: jest.Mock;
  let emailSenderMock: EmailSenderPort;

  beforeEach(async () => {
    sendWelcomeEmailMock = jest.fn().mockResolvedValue(undefined);
    emailSenderMock = {
      sendWelcomeEmail: sendWelcomeEmailMock,
    };

    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(EMAIL_SENDER_PORT)
      .useValue(emailSenderMock)
      .overrideProvider('KAFKA_CLIENT')
      .useValue({
        subscribeToResponseOf: jest.fn(),
        connect: jest.fn().mockResolvedValue(undefined),
      })
      .compile();

    controller = moduleRef.get<KafkaConsumerController>(KafkaConsumerController);
    sendEmailUseCase = moduleRef.get<SendEmailUseCase>(SendEmailUseCase);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('should compile the AppModule and resolve core dependencies', () => {
    expect(controller).toBeDefined();
    expect(sendEmailUseCase).toBeDefined();
  });

  it('should process Kafka message and trigger welcome email delivery', async () => {
    const message = {
      eventName: 'user.created',
      payload: {
        id: 'usr-456',
        name: 'Carlos Ruiz',
        email: 'carlos.ruiz@example.com',
      },
    };

    await controller.handleUserEvents(message);

    expect(sendWelcomeEmailMock).toHaveBeenCalledTimes(1);
    expect(sendWelcomeEmailMock).toHaveBeenCalledWith(
      'carlos.ruiz@example.com',
      'Carlos Ruiz',
    );
  });
});

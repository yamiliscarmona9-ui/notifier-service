import { Test, TestingModule } from '@nestjs/testing';
import { KafkaConsumerController } from './kafka-consumer.controller';
import { SendEmailUseCase } from '../../../application/use-cases/send-email.use-case';

describe('KafkaConsumerController', () => {
  let controller: KafkaConsumerController;
  let sendEmailUseCaseMock: { sendWelcomeEmail: jest.Mock };

  beforeEach(async () => {
    sendEmailUseCaseMock = {
      sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [KafkaConsumerController],
      providers: [
        {
          provide: SendEmailUseCase,
          useValue: sendEmailUseCaseMock,
        },
      ],
    }).compile();

    controller = module.get<KafkaConsumerController>(KafkaConsumerController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('extractUserData', () => {
    it('should extract direct email and name', () => {
      const payload = { email: 'john@example.com', name: 'John Doe' };
      const result = controller.extractUserData(payload);

      expect(result).toEqual({ email: 'john@example.com', name: 'John Doe' });
    });

    it('should extract from Spring Boot UserCreatedDomainEvent payload format', () => {
      const springBootEvent = {
        eventName: 'user.created',
        payload: {
          id: 'user-001',
          name: 'John Arrieta',
          email: 'john.arrieta@gmail.com',
          role: 'MEMBER',
          status: 'ACTIVE',
        },
      };

      const result = controller.extractUserData(springBootEvent);
      expect(result).toEqual({
        email: 'john.arrieta@gmail.com',
        name: 'John Arrieta',
      });
    });

    it('should extract from nested user object', () => {
      const payload = {
        user: {
          email: 'alice@example.com',
          name: 'Alice Wonder',
        },
      };

      const result = controller.extractUserData(payload);
      expect(result).toEqual({
        email: 'alice@example.com',
        name: 'Alice Wonder',
      });
    });

    it('should extract from KafkaJS message wrapper with value property', () => {
      const kafkaMessage = {
        key: 'user-001',
        value: JSON.stringify({ email: 'bob@example.com', name: 'Bob Smith' }),
      };

      const result = controller.extractUserData(kafkaMessage);
      expect(result).toEqual({
        email: 'bob@example.com',
        name: 'Bob Smith',
      });
    });

    it('should extract from raw Buffer', () => {
      const buffer = Buffer.from(
        JSON.stringify({ email: 'buffer@example.com', name: 'Buffer User' }),
      );

      const result = controller.extractUserData(buffer);
      expect(result).toEqual({
        email: 'buffer@example.com',
        name: 'Buffer User',
      });
    });

    it('should return empty object for invalid payload or payload without email', () => {
      expect(controller.extractUserData(null)).toEqual({});
      expect(controller.extractUserData({})).toEqual({});
      expect(controller.extractUserData({ name: 'No Email' })).toEqual({
        email: undefined,
        name: 'No Email',
      });
      expect(controller.extractUserData('invalid-json')).toEqual({});
    });
  });

  describe('handleUserEvents', () => {
    it('should extract email and name and call sendEmailUseCase', async () => {
      const payload = {
        email: 'john@example.com',
        name: 'John Doe',
      };

      await controller.handleUserEvents(payload);

      expect(sendEmailUseCaseMock.sendWelcomeEmail).toHaveBeenCalledTimes(1);
      expect(sendEmailUseCaseMock.sendWelcomeEmail).toHaveBeenCalledWith(
        'john@example.com',
        'John Doe',
      );
    });

    it('should ignore event when email is missing and not call sendEmailUseCase', async () => {
      const payload = { name: 'Only Name' };

      await controller.handleUserEvents(payload);

      expect(sendEmailUseCaseMock.sendWelcomeEmail).not.toHaveBeenCalled();
    });
  });
});

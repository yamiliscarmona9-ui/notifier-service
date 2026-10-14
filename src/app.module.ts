import { Module, OnModuleInit, Inject, Logger } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ClientsModule, Transport, ClientKafka } from '@nestjs/microservices';
import { EMAIL_SENDER_PORT } from './domain/ports/email-sender.port';
import { SendEmailUseCase } from './application/use-cases/send-email.use-case';
import { SmtpEmailAdapter } from './infrastructure/adapters/out/smtp-email.adapter';
import { KafkaConsumerController } from './infrastructure/adapters/in/kafka-consumer.controller';
import { getKafkaConfig } from './infrastructure/config/kafka.config';

export const KAFKA_CLIENT_TOKEN = 'KAFKA_CLIENT';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),
    ClientsModule.registerAsync([
      {
        name: KAFKA_CLIENT_TOKEN,
        useFactory: () => ({
          transport: Transport.KAFKA,
          options: getKafkaConfig(),
        }),
      },
    ]),
  ],
  controllers: [KafkaConsumerController],
  providers: [
    SendEmailUseCase,
    {
      provide: EMAIL_SENDER_PORT,
      useClass: SmtpEmailAdapter,
    },
  ],
  exports: [SendEmailUseCase, EMAIL_SENDER_PORT],
})
export class AppModule implements OnModuleInit {
  private readonly logger = new Logger(AppModule.name);

  constructor(
    @Inject(KAFKA_CLIENT_TOKEN)
    private readonly kafkaClient: ClientKafka,
  ) {}

  async onModuleInit() {
    this.logger.log('Subscribing ClientKafka to "user-events" topic...');
    this.kafkaClient.subscribeToResponseOf('user-events');

    try {
      await this.kafkaClient.connect();
      this.logger.log('ClientKafka connected successfully to Aiven Kafka broker.');
    } catch (error) {
      this.logger.warn(
        `ClientKafka could not establish initial connection: ${(error as Error).message}. Will retry automatically when broker is available.`,
      );
    }
  }
}

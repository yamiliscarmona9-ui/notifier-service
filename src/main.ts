import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { MicroserviceOptions } from '@nestjs/microservices';
import { AppModule } from './app.module';
import { getKafkaMicroserviceOptions } from './infrastructure/config/kafka.config';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    getKafkaMicroserviceOptions(),
  );

  await app.listen();
  logger.log('Notifiers Microservice started successfully as a background Kafka worker.');
}

void bootstrap();

import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload, Ctx, KafkaContext } from '@nestjs/microservices';
import { SendEmailUseCase } from '../../../application/use-cases/send-email.use-case';

@Controller()
export class KafkaConsumerController {
  private readonly logger = new Logger(KafkaConsumerController.name);

  constructor(private readonly sendEmailUseCase: SendEmailUseCase) {}

  @MessagePattern('user-events')
  async handleUserEvents(
    @Payload() message: any,
    @Ctx() context?: KafkaContext,
  ): Promise<void> {
    const topic = context?.getTopic?.() ?? 'user-events';
    this.logger.log(`Received Kafka message on topic '${topic}'`);
    this.logger.debug(`Raw message payload: ${typeof message === 'object' ? JSON.stringify(message) : message}`);

    const { email, name } = this.extractUserData(message);

    if (!email) {
      this.logger.warn(`Ignored message on topic '${topic}': Could not extract a valid email address from payload.`);
      return;
    }

    this.logger.log(`Processing welcome email for user: ${name || 'Usuario'} <${email}>`);
    await this.sendEmailUseCase.sendWelcomeEmail(email, name || 'Usuario');
  }

  /**
   * Safely extracts email and name from diverse Kafka message formats,
   * including Spring Boot UserCreatedDomainEvent payloads, nested objects, Buffers, and raw JSON strings.
   */
  public extractUserData(payload: any): { email?: string; name?: string } {
    if (!payload) return {};

    let data = payload;

    if (Buffer.isBuffer(data)) {
      try {
        data = JSON.parse(data.toString('utf-8'));
      } catch {
        return {};
      }
    } else if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch {
        return {};
      }
    }

    // If KafkaJS encapsulates inside a 'value' property
    if (data?.value !== undefined) {
      if (Buffer.isBuffer(data.value)) {
        try {
          data = JSON.parse(data.value.toString('utf-8'));
        } catch {
          data = data.value;
        }
      } else if (typeof data.value === 'string') {
        try {
          data = JSON.parse(data.value);
        } catch {
          data = data.value;
        }
      } else if (typeof data.value === 'object' && data.value !== null) {
        data = data.value;
      }
    }

    // Inspect nested structures commonly produced by domain events
    // (e.g., event.payload, event.user, event.data, or top-level fields)
    const source = data?.payload || data?.user || data?.data || data;

    const email = source?.email || data?.email;
    const name =
      source?.name ||
      data?.name ||
      (source?.firstName ? `${source.firstName} ${source.lastName ?? ''}`.trim() : undefined) ||
      data?.username;

    return {
      email: typeof email === 'string' && email.includes('@') ? email.trim() : undefined,
      name: typeof name === 'string' && name.trim().length > 0 ? name.trim() : undefined,
    };
  }
}

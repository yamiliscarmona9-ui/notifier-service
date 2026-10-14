import { Inject, Injectable, Logger } from '@nestjs/common';
import { EMAIL_SENDER_PORT } from '../../domain/ports/email-sender.port';
import type { EmailSenderPort } from '../../domain/ports/email-sender.port';

@Injectable()
export class SendEmailUseCase {
  private readonly logger = new Logger(SendEmailUseCase.name);

  constructor(
    @Inject(EMAIL_SENDER_PORT)
    private readonly emailSender: EmailSenderPort,
  ) {}

  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    if (!email || !email.trim()) {
      this.logger.warn('Skipping email delivery: recipient email is missing or empty.');
      return;
    }

    const trimmedEmail = email.trim();
    const recipientName = name?.trim() || 'Usuario';

    this.logger.log(`Executing SendEmailUseCase for recipient: ${trimmedEmail} (${recipientName})`);
    await this.emailSender.sendWelcomeEmail(trimmedEmail, recipientName);
  }
}

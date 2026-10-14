import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { EmailSenderPort } from '../../../domain/ports/email-sender.port';

@Injectable()
export class SmtpEmailAdapter implements EmailSenderPort {
  private readonly logger = new Logger(SmtpEmailAdapter.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST', 'smtp.gmail.com');
    const port = Number(this.configService.get<number>('SMTP_PORT', 587));
    const secure = this.configService.get<string>('SMTP_SECURE') === 'true' || port === 465;
    const user = this.configService.get<string>('SMTP_USER') || this.configService.get<string>('SMTP_USERNAME');
    const pass = this.configService.get<string>('SMTP_PASS') || this.configService.get<string>('SMTP_PASSWORD');

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user ? { user, pass: pass || '' } : undefined,
    });
  }

  // Method to allow mocking or overriding transporter in tests
  setTransporter(transporter: nodemailer.Transporter): void {
    this.transporter = transporter;
  }

  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    const fromAddress =
      this.configService.get<string>('SMTP_FROM_ADDRESS') ||
      this.configService.get<string>('SMTP_FROM') ||
      'no-reply@example.com';
    const fromName = this.configService.get<string>('SMTP_FROM_NAME', 'Gestión de Usuarios');
    const from = `"${fromName}" <${fromAddress}>`;

    const subject = `¡Bienvenido a la plataforma, ${name}!`;
    const text = `Hola ${name},\n\n¡Bienvenido a nuestra plataforma! Tu cuenta ha sido creada exitosamente.\n\nSaludos cordiales,\nEl equipo.`;
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #2b6cb0; margin-top: 0;">¡Bienvenido/a, ${name}!</h2>
        <p>Tu cuenta ha sido creada con éxito en el sistema.</p>
        <p>Estamos muy contentos de darte la bienvenida. Ya puedes acceder y disfrutar de todos nuestros servicios.</p>
        <br />
        <p>Atentamente,<br /><strong>${fromName}</strong></p>
        <hr style="border: none; border-top: 1px solid #edf2f7; margin: 24px 0;" />
        <small style="color: #718096;">Este es un mensaje generado automáticamente. Por favor no respondas a este correo.</small>
      </div>
    `;

    this.logger.log(`Dispatching welcome email to: ${email}`);
    try {
      const info = await this.transporter.sendMail({
        from,
        to: email,
        subject,
        text,
        html,
      });
      this.logger.log(`Welcome email successfully sent to ${email}. Message ID: ${info?.messageId ?? 'N/A'}`);
    } catch (error) {
      this.logger.error(`Error sending welcome email to ${email}: ${(error as Error).message}`, (error as Error).stack);
      throw error;
    }
  }
}

export interface EmailSenderPort {
  sendWelcomeEmail(email: string, name: string): Promise<void>;
}

export const EMAIL_SENDER_PORT = 'EmailSenderPort';

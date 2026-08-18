export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

export interface EmailMessage {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
  tags?: Record<string, string>;
}

export interface EmailResult {
  id: string | null;
  provider: string;
  delivered: boolean;
}

export interface EmailProvider {
  readonly name: string;
  readonly available: boolean;
  send(message: EmailMessage): Promise<EmailResult>;
}

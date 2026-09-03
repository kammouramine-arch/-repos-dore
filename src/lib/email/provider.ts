import { Resend } from 'resend';
import { env } from '../env';
import { AppError } from '../errors';
import type { EmailMessage, EmailProvider, EmailResult } from './types';

/** Fournisseur transactionnel de production. */
class ResendProvider implements EmailProvider {
  readonly name = 'resend';
  private client: Resend;

  constructor(apiKey: string, private from: string) {
    this.client = new Resend(apiKey);
  }

  get available() {
    return true;
  }

  async send(message: EmailMessage): Promise<EmailResult> {
    const { data, error } = await this.client.emails.send({
      from: this.from,
      to: Array.isArray(message.to) ? message.to : [message.to],
      subject: message.subject,
      html: message.html,
      text: message.text,
      replyTo: message.replyTo,
      attachments: message.attachments?.map((a) => ({
        filename: a.filename,
        content: typeof a.content === 'string' ? a.content : a.content.toString('base64'),
      })),
    });

    if (error) {
      throw new AppError('PROVIDER_UNAVAILABLE', "L'email n'a pas pu être envoyé.", { cause: error });
    }
    return { id: data?.id ?? null, provider: this.name, delivered: true };
  }
}

/**
 * Fournisseur de développement : l'email est journalisé au lieu d'être envoyé.
 * Aucune donnée n'est transmise à l'extérieur tant qu'aucune clé n'est configurée.
 */
class ConsoleProvider implements EmailProvider {
  readonly name = 'console';
  get available() {
    return true;
  }

  async send(message: EmailMessage): Promise<EmailResult> {
    const recipients = Array.isArray(message.to) ? message.to.join(', ') : message.to;
    console.info(`[email:console] -> ${recipients} | ${message.subject}`);
    return { id: null, provider: this.name, delivered: false };
  }
}

let cached: EmailProvider | null = null;

export function getEmailProvider(): EmailProvider {
  if (cached) return cached;
  const config = env();
  cached =
    config.EMAIL_PROVIDER === 'resend' && config.RESEND_API_KEY
      ? new ResendProvider(config.RESEND_API_KEY, config.EMAIL_FROM)
      : new ConsoleProvider();
  return cached;
}

export function resetEmailProvider() {
  cached = null;
}

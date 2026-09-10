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
      replyTo: message.replyTo ?? env().EMAIL_REPLY_TO,
      attachments: message.attachments?.map((a) => ({
        filename: a.filename,
        content: typeof a.content === 'string' ? a.content : a.content.toString('base64'),
      })),
    });

    if (error || !data?.id) {
      throw new AppError('PROVIDER_UNAVAILABLE', "L'email n'a pas pu être envoyé.", { cause: error });
    }
    return { id: data.id, provider: this.name, delivered: true };
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

/**
 * État du domaine d'expédition chez Resend, pour la sonde de santé.
 *
 * « Clé présente » ne veut pas dire « envoi possible » : Resend refuse tout
 * message tant que le domaine de `EMAIL_FROM` n'est pas vérifié, et
 * l'inscription mobile répond alors 503 sans qu'on sache pourquoi. Le résultat
 * est gardé cinq minutes ; une clé sans droit de lecture donne `unknown`.
 */
export interface SendingDomainStatus {
  domain: string | null;
  status: 'verified' | 'unverified' | 'missing' | 'unknown' | 'not_applicable';
  detail?: string;
}

let domainCache: { at: number; value: SendingDomainStatus } | null = null;
const DOMAIN_CACHE_MS = 5 * 60_000;

export function senderDomain(from: string): string | null {
  const match = /@([^\s<>@]+?)>?\s*$/.exec(from.trim());
  return match ? match[1]!.toLowerCase() : null;
}

export async function describeSendingDomain(): Promise<SendingDomainStatus> {
  const config = env();
  if (config.EMAIL_PROVIDER !== 'resend' || !config.RESEND_API_KEY) {
    return { domain: senderDomain(config.EMAIL_FROM), status: 'not_applicable' };
  }
  if (domainCache && Date.now() - domainCache.at < DOMAIN_CACHE_MS) return domainCache.value;
  const domain = senderDomain(config.EMAIL_FROM);
  let value: SendingDomainStatus;
  try {
    const { data, error } = await new Resend(config.RESEND_API_KEY).domains.list();
    if (error || !data) {
      value = { domain, status: 'unknown', detail: error?.name ?? 'list_failed' };
    } else {
      const found = data.data.find((entry) => entry.name.toLowerCase() === domain);
      value = !found
        ? { domain, status: 'missing', detail: 'domaine absent du compte Resend' }
        : { domain, status: found.status === 'verified' ? 'verified' : 'unverified', detail: found.status };
    }
  } catch (error) {
    value = { domain, status: 'unknown', detail: error instanceof Error ? error.name : 'error' };
  }
  domainCache = { at: Date.now(), value };
  return value;
}

/** Tests uniquement. */
export function resetSendingDomainCache() {
  domainCache = null;
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

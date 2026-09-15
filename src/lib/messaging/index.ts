/**
 * Abstraction de messagerie (SMS / WhatsApp).
 *
 * Le MVP n'en dépend pas : par défaut aucun fournisseur n'est configuré et les
 * relances passent par email. L'architecture permet d'ajouter Twilio ou
 * WhatsApp Business API sans toucher au reste de l'application.
 */
import { env } from '../env';
import { AppError } from '../errors';

export type MessagingChannel = 'sms' | 'whatsapp';

export interface OutboundMessage {
  to: string;
  body: string;
  channel: MessagingChannel;
}

export interface TemplateMessage {
  to: string;
  templateName: string;
  language?: string;
  variables?: Record<string, string>;
  channel: MessagingChannel;
}

export interface InboundMessage {
  from: string;
  body: string;
  channel: MessagingChannel;
  externalId: string;
  receivedAt: Date;
  raw: unknown;
}

export interface MessagingResult {
  id: string | null;
  provider: string;
  delivered: boolean;
}

export interface MessagingProvider {
  readonly name: string;
  readonly available: boolean;
  readonly channels: MessagingChannel[];
  sendMessage(message: OutboundMessage): Promise<MessagingResult>;
  sendTemplate(message: TemplateMessage): Promise<MessagingResult>;
  /** Normalise un webhook entrant en message applicatif. */
  receiveMessage(payload: unknown): InboundMessage | null;
}

class TwilioProvider implements MessagingProvider {
  readonly name = 'twilio';
  readonly channels: MessagingChannel[] = ['sms', 'whatsapp'];

  constructor(
    private accountSid: string,
    private authToken: string,
    private fromNumber: string,
  ) {}

  get available() {
    return true;
  }

  async sendMessage(message: OutboundMessage): Promise<MessagingResult> {
    const prefix = message.channel === 'whatsapp' ? 'whatsapp:' : '';
    const body = new URLSearchParams({
      To: `${prefix}${message.to}`,
      From: `${prefix}${this.fromNumber}`,
      Body: message.body,
    });

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      },
    );

    if (!response.ok) {
      throw new AppError('PROVIDER_UNAVAILABLE', "Le message n'a pas pu être envoyé.");
    }
    const payload = (await response.json()) as { sid?: string };
    return { id: payload.sid ?? null, provider: this.name, delivered: true };
  }

  async sendTemplate(message: TemplateMessage): Promise<MessagingResult> {
    // Twilio applique les templates via le Content API ; en attendant son
    // activation par l'entreprise, le corps interpolé est envoyé tel quel.
    const body = Object.entries(message.variables ?? {}).reduce(
      (acc, [key, value]) => acc.replaceAll(`{{${key}}}`, value),
      message.templateName,
    );
    return this.sendMessage({ to: message.to, body, channel: message.channel });
  }

  receiveMessage(payload: unknown): InboundMessage | null {
    const data = payload as Record<string, string> | null;
    if (!data?.From || !data?.Body) return null;
    const isWhatsApp = data.From.startsWith('whatsapp:');
    return {
      from: data.From.replace('whatsapp:', ''),
      body: data.Body,
      channel: isWhatsApp ? 'whatsapp' : 'sms',
      externalId: data.MessageSid ?? data.SmsSid ?? crypto.randomUUID(),
      receivedAt: new Date(),
      raw: payload,
    };
  }
}

let cached: MessagingProvider | null | undefined;

export function getMessagingProvider(): MessagingProvider | null {
  if (cached !== undefined) return cached;
  const config = env();
  if (
    config.MESSAGING_PROVIDER === 'twilio' &&
    config.TWILIO_ACCOUNT_SID &&
    config.TWILIO_AUTH_TOKEN &&
    config.TWILIO_FROM_NUMBER
  ) {
    cached = new TwilioProvider(
      config.TWILIO_ACCOUNT_SID,
      config.TWILIO_AUTH_TOKEN,
      config.TWILIO_FROM_NUMBER,
    );
  } else {
    cached = null;
  }
  return cached;
}

export function resetMessagingProvider() {
  cached = undefined;
}

/** Canaux réellement disponibles pour l'organisation (pilote l'interface). */
export function availableChannels(): { email: boolean; sms: boolean; whatsapp: boolean } {
  const provider = getMessagingProvider();
  return {
    email: true,
    sms: provider?.channels.includes('sms') ?? false,
    whatsapp: provider?.channels.includes('whatsapp') ?? false,
  };
}

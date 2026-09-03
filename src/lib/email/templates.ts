/**
 * Modèles d'emails DEVISIA — HTML responsive, tables compatibles Outlook,
 * français par défaut. Tout contenu dynamique est échappé.
 */
import { appUrl } from '../env';
import { formatCents } from '../money';

export function esc(value: string | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

interface LayoutOptions {
  title: string;
  preview?: string;
  brandColor?: string;
  companyName?: string;
  body: string;
  cta?: { label: string; href: string };
  footnote?: string;
}

const NEUTRAL = {
  ink: '#0B0F14',
  muted: '#5B6572',
  line: '#E5E8EC',
  surface: '#F6F7F9',
};

export function layout(options: LayoutOptions): string {
  const brand = options.brandColor ?? '#0F62FE';
  const company = esc(options.companyName ?? 'DEVISIA');
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="light" />
<title>${esc(options.title)}</title>
</head>
<body style="margin:0;padding:0;background:${NEUTRAL.surface};">
${options.preview ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(options.preview)}</div>` : ''}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${NEUTRAL.surface};padding:32px 16px;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border:1px solid ${NEUTRAL.line};border-radius:14px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Roboto,Helvetica,Arial,sans-serif;">
      <tr><td style="padding:28px 32px 8px 32px;">
        <div style="font-size:13px;letter-spacing:0.14em;text-transform:uppercase;color:${NEUTRAL.muted};font-weight:600;">${company}</div>
      </td></tr>
      <tr><td style="padding:8px 32px 4px 32px;">
        <h1 style="margin:0;font-size:22px;line-height:1.3;color:${NEUTRAL.ink};font-weight:650;letter-spacing:-0.01em;">${esc(options.title)}</h1>
      </td></tr>
      <tr><td style="padding:12px 32px 4px 32px;font-size:15px;line-height:1.65;color:${NEUTRAL.ink};">
        ${options.body}
      </td></tr>
      ${
        options.cta
          ? `<tr><td style="padding:20px 32px 8px 32px;">
        <a href="${esc(options.cta.href)}" style="display:inline-block;background:${brand};color:#FFFFFF;text-decoration:none;font-size:15px;font-weight:600;padding:13px 22px;border-radius:10px;">${esc(options.cta.label)}</a>
      </td></tr>`
          : ''
      }
      ${
        options.footnote
          ? `<tr><td style="padding:12px 32px 0 32px;font-size:13px;line-height:1.6;color:${NEUTRAL.muted};">${options.footnote}</td></tr>`
          : ''
      }
      <tr><td style="padding:28px 32px 26px 32px;">
        <div style="border-top:1px solid ${NEUTRAL.line};padding-top:16px;font-size:12px;line-height:1.6;color:${NEUTRAL.muted};">
          Envoyé par <strong style="color:${NEUTRAL.ink};font-weight:600;">DEVISIA</strong> — l'IA qui transforme votre travail en devis.<br />
          <a href="${appUrl()}" style="color:${NEUTRAL.muted};">devisia.fr</a>
        </div>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

const p = (content: string) => `<p style="margin:0 0 14px 0;">${content}</p>`;

export function welcomeEmail(params: { firstName?: string | null }): RenderedEmail {
  const hello = params.firstName ? `Bonjour ${esc(params.firstName)},` : 'Bonjour,';
  return {
    subject: 'Bienvenue sur DEVISIA',
    html: layout({
      title: 'Bienvenue sur DEVISIA',
      preview: 'Créez votre premier devis en moins d’une minute.',
      body:
        p(hello) +
        p("Votre compte est prêt. DEVISIA prépare vos devis à partir de votre description du chantier : vous parlez ou vous écrivez, l'application s'occupe du reste.") +
        p('Vous gardez toujours la main : chaque devis est vérifié et validé par vous avant envoi.'),
      cta: { label: 'Créer mon premier devis', href: appUrl('/app/devis/nouveau') },
      footnote: 'Une question ? Répondez simplement à cet email.',
    }),
    text: `${params.firstName ? `Bonjour ${params.firstName},` : 'Bonjour,'}\n\nVotre compte DEVISIA est prêt. Créez votre premier devis : ${appUrl('/app/devis/nouveau')}\n`,
  };
}

export function verifyEmailTemplate(params: { url: string }): RenderedEmail {
  return {
    subject: 'Confirmez votre adresse email',
    html: layout({
      title: 'Confirmez votre adresse email',
      body: p('Pour sécuriser votre compte DEVISIA, confirmez votre adresse email en cliquant sur le bouton ci-dessous.'),
      cta: { label: 'Confirmer mon email', href: params.url },
      footnote: 'Ce lien expire dans 24 heures. Si vous n’êtes pas à l’origine de cette demande, ignorez cet email.',
    }),
    text: `Confirmez votre adresse email DEVISIA : ${params.url}\nCe lien expire dans 24 heures.`,
  };
}

export function resetPasswordEmail(params: { url: string }): RenderedEmail {
  return {
    subject: 'Réinitialisation de votre mot de passe',
    html: layout({
      title: 'Réinitialisation de votre mot de passe',
      body: p('Vous avez demandé à réinitialiser votre mot de passe DEVISIA. Ce lien est valable une heure.'),
      cta: { label: 'Choisir un nouveau mot de passe', href: params.url },
      footnote: "Si vous n'êtes pas à l'origine de cette demande, aucune action n'est nécessaire : votre mot de passe reste inchangé.",
    }),
    text: `Réinitialisez votre mot de passe DEVISIA : ${params.url}\nCe lien expire dans 1 heure.`,
  };
}

export function quoteSentEmail(params: {
  customerName: string;
  companyName: string;
  quoteNumber: string;
  quoteTitle: string;
  totalCents: number;
  validUntil?: Date | null;
  publicUrl: string;
  brandColor?: string;
  message?: string | null;
}): RenderedEmail {
  const validity = params.validUntil
    ? `Ce devis est valable jusqu'au ${new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(params.validUntil)}.`
    : '';
  return {
    subject: `Votre devis ${params.quoteNumber} — ${params.companyName}`,
    html: layout({
      title: `Votre devis ${esc(params.quoteNumber)}`,
      companyName: params.companyName,
      brandColor: params.brandColor,
      preview: `${params.quoteTitle} — ${formatCents(params.totalCents)} TTC`,
      body:
        p(`Bonjour ${esc(params.customerName)},`) +
        (params.message ? p(esc(params.message).replace(/\n/g, '<br />')) : p(`Vous trouverez ci-dessous votre devis pour : <strong>${esc(params.quoteTitle)}</strong>.`)) +
        p(`<strong style="font-size:20px;">${formatCents(params.totalCents)} TTC</strong>`) +
        (validity ? p(esc(validity)) : ''),
      cta: { label: 'Consulter et accepter le devis', href: params.publicUrl },
      footnote: 'Le devis complet est également joint à cet email au format PDF.',
    }),
    text: `Bonjour ${params.customerName},\n\nVotre devis ${params.quoteNumber} — ${params.quoteTitle}\nMontant : ${formatCents(params.totalCents)} TTC\n\nConsulter : ${params.publicUrl}\n\n${params.companyName}`,
  };
}

export function followUpEmail(params: {
  subject: string;
  message: string;
  publicUrl: string;
  companyName: string;
  brandColor?: string;
}): RenderedEmail {
  return {
    subject: params.subject,
    html: layout({
      title: params.subject,
      companyName: params.companyName,
      brandColor: params.brandColor,
      body: p(esc(params.message).replace(/\n/g, '<br />')),
      cta: { label: 'Revoir le devis', href: params.publicUrl },
    }),
    text: `${params.message}\n\nRevoir le devis : ${params.publicUrl}`,
  };
}

export function quoteAcceptedInternalEmail(params: {
  customerName: string;
  quoteNumber: string;
  totalCents: number;
}): RenderedEmail {
  return {
    subject: `Devis ${params.quoteNumber} accepté — ${formatCents(params.totalCents)}`,
    html: layout({
      title: 'Un devis vient d’être accepté',
      body:
        p(`<strong>${esc(params.customerName)}</strong> a accepté le devis ${esc(params.quoteNumber)}.`) +
        p(`Montant : <strong>${formatCents(params.totalCents)} TTC</strong>`),
      cta: { label: 'Voir le devis', href: appUrl('/app/devis') },
    }),
    text: `${params.customerName} a accepté le devis ${params.quoteNumber} (${formatCents(params.totalCents)} TTC).`,
  };
}

export function newLeadEmail(params: {
  contactName: string;
  title: string;
  phone?: string | null;
  email?: string | null;
  description?: string | null;
}): RenderedEmail {
  return {
    subject: `Nouvelle demande de devis — ${params.contactName}`,
    html: layout({
      title: 'Nouvelle demande de devis',
      body:
        p(`<strong>${esc(params.contactName)}</strong> vous a envoyé une demande.`) +
        p(`Objet : ${esc(params.title)}`) +
        (params.phone ? p(`Téléphone : ${esc(params.phone)}`) : '') +
        (params.email ? p(`Email : ${esc(params.email)}`) : '') +
        (params.description ? p(esc(params.description).replace(/\n/g, '<br />')) : ''),
      cta: { label: 'Ouvrir le prospect', href: appUrl('/app/prospects') },
      footnote: 'Répondre dans l’heure multiplie vos chances de décrocher le chantier.',
    }),
    text: `Nouvelle demande de ${params.contactName} — ${params.title}\n${params.phone ?? ''} ${params.email ?? ''}\n\n${params.description ?? ''}`,
  };
}

export function teamInvitationEmail(params: {
  organizationName: string;
  url: string;
  roleLabel: string;
}): RenderedEmail {
  return {
    subject: `Rejoignez ${params.organizationName} sur DEVISIA`,
    html: layout({
      title: `Rejoignez ${esc(params.organizationName)}`,
      body:
        p(`Vous êtes invité à rejoindre <strong>${esc(params.organizationName)}</strong> sur DEVISIA en tant que ${esc(params.roleLabel)}.`) +
        p('DEVISIA permet à votre équipe de créer, envoyer et suivre les devis depuis le chantier.'),
      cta: { label: "Accepter l'invitation", href: params.url },
      footnote: 'Cette invitation expire dans 7 jours.',
    }),
    text: `Rejoignez ${params.organizationName} sur DEVISIA : ${params.url}`,
  };
}

export function paymentReceiptEmail(params: {
  plan: string;
  amountCents: number;
  periodEnd?: Date | null;
}): RenderedEmail {
  return {
    subject: 'Votre abonnement DEVISIA est actif',
    html: layout({
      title: 'Abonnement confirmé',
      body:
        p(`Votre formule <strong>${esc(params.plan)}</strong> est active.`) +
        p(`Montant : ${formatCents(params.amountCents)}`) +
        (params.periodEnd
          ? p(`Prochaine échéance : ${new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(params.periodEnd)}`)
          : ''),
      cta: { label: 'Ouvrir DEVISIA', href: appUrl('/app') },
    }),
    text: `Votre abonnement DEVISIA ${params.plan} est actif (${formatCents(params.amountCents)}).`,
  };
}

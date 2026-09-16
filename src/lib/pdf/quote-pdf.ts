import { LineCapStyle, PDFDocument, rgb, type PDFFont, type PDFPage, type PDFImage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { centsToEuros, formatPercent, formatQuantity } from '../money';

/**
 * Génération du PDF de devis.
 *
 * Mise en page sobre et dense en information, pensée pour être envoyée telle
 * quelle à un client. Les polices standard (Helvetica) évitent d'embarquer une
 * fonte : le PDF reste léger et s'ouvre partout.
 */

const A4 = { width: 595.28, height: 841.89 };
const MARGIN = 48;
const CONTENT_WIDTH = A4.width - MARGIN * 2;

const INK = rgb(0.043, 0.059, 0.078);
const MUTED = rgb(0.357, 0.396, 0.447);
const LINE = rgb(0.898, 0.91, 0.925);
const SOFT = rgb(0.973, 0.976, 0.98);
const WHITE = rgb(1, 1, 1);

/**
 * Polices du document.
 *
 * Les polices standard de PDF (Helvetica) sont codées en CP1252 : il fallait
 * remplacer les apostrophes typographiques, les tirets longs et jusqu'au
 * symbole euro par des approximations. Une police incorporée règle le
 * problème à la racine et donne une vraie maîtrise typographique.
 *
 * pdf-lib ne retient que les glyphes réellement employés : le fichier
 * embarqué pèse quelques kilo-octets, pas les quatre cents du fichier source.
 */
const FONT_DIR = path.join(process.cwd(), 'src/lib/pdf/fonts');
let fontCache: { regular: Uint8Array; bold: Uint8Array } | null = null;

function loadFonts(): { regular: Uint8Array; bold: Uint8Array } | null {
  if (fontCache) return fontCache;
  try {
    fontCache = {
      regular: new Uint8Array(readFileSync(path.join(FONT_DIR, 'DocSans-Regular.ttf'))),
      bold: new Uint8Array(readFileSync(path.join(FONT_DIR, 'DocSans-Bold.ttf'))),
    };
    return fontCache;
  } catch {
    // Police introuvable (empaquetage inattendu) : on retombe sur Helvetica
    // plutôt que de ne produire aucun document.
    return null;
  }
}

/**
 * Nettoie un texte avant de le dessiner.
 *
 * La police incorporée couvre le latin étendu, l'euro et la ponctuation
 * typographique : apostrophes courbes, tirets longs et espaces insécables
 * sont conservés tels quels. Seuls les caractères de contrôle et les espaces
 * exotiques, que pdf-lib ne sait pas mesurer, sont normalisés.
 */
function safeText(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .replace(new RegExp('[\\u202f\\u2009\\u2007]', 'g'), '\u00a0')
    .replace(new RegExp('[\\u00ad]', 'g'), '')
    .replace(new RegExp('[\\u0000-\\u001f\\u007f]', 'g'), '');
}

function money(cents: number, input: Pick<QuotePdfInput, 'language' | 'country' | 'currency'>): string {
  const language = input.language === 'en';
  const locale = language ? (input.country === 'US' ? 'en-US' : 'en-GB') : 'fr-FR';
  const currency = input.currency ?? (input.country === 'GB' ? 'GBP' : input.country === 'US' ? 'USD' : 'EUR');
  return new Intl.NumberFormat(locale, { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(centsToEuros(cents)).replace(new RegExp('[\\u202f\\u00a0]', 'g'), ' ');
}

function formatDate(date: Date | null | undefined, input: Pick<QuotePdfInput, 'language' | 'country'>): string {
  if (!date) return '-';
  const locale = input.language === 'en' ? (input.country === 'US' ? 'en-US' : 'en-GB') : 'fr-FR';
  return new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(date).replace(new RegExp('[\\u202f\\u00a0]', 'g'), ' ');
}

export function quotePdfLabels(input: Pick<QuotePdfInput, 'language' | 'country' | 'document'>) {
  const english = input.language === 'en';
  const invoice = input.document === 'invoice';
  const country = (input.country ?? 'FR').toUpperCase();
  const us = country === 'US';
  const gb = country === 'GB';
  return english ? {
    title: invoice ? 'INVOICE' : us ? 'ESTIMATE' : 'QUOTE', company: 'COMPANY', customer: 'CUSTOMER', object: 'SUBJECT', grandTotal: 'TOTAL', grandTotalExempt: 'TOTAL', labourRate: 'Labour charged at the hourly rate shown, per hour of work on site.', replacedParts: 'You may keep any parts or equipment that are replaced.',
    designation: 'DESCRIPTION', quantity: 'QTY', unit: 'UNIT', unitPrice: 'UNIT PRICE', tax: us ? 'Sales tax' : 'VAT', totalEx: 'TOTAL',
    totalExLabel: 'Subtotal', netEx: 'Net subtotal', vat: us ? 'Sales tax' : 'VAT', notApplicable: 'Not applicable', total: 'TOTAL',
    discount: 'Discount', companyIdentifier: us ? 'Business ID' : 'Company number', vatExemption: us ? 'Sales tax exempt' : 'VAT exempt',
    deposit: 'Deposit due', duration: 'Estimated duration', payment: 'PAYMENT TERMS', conditions: 'TERMS', notes: 'NOTES',
    acceptance: invoice ? 'PAYMENT' : 'ACCEPTANCE',
    acceptanceText: invoice ? 'Amount due on the date shown above.' : 'Please sign and return this quote to confirm.',
    date: 'Date', signature: 'Customer name and signature',
    validUntil: 'Valid until', issued: 'Issued', offerValid: 'Offer valid until',
    signedElectronically: 'Accepted and signed online',
    acceptedBy: 'ACCEPTED BY',
    electronicNotice: 'Electronic acceptance recorded by DEVISERA: name, date and signature, bound to this exact quote.',
    signedOn: 'on', paid: 'Already paid', balance: 'Balance due', dueOn: 'Payment due',
    paymentDetails: 'PAYMENT DETAILS', settled: 'PAID IN FULL',
  } : {
    title: invoice ? 'FACTURE' : 'DEVIS', company: 'ENTREPRISE', customer: 'CLIENT', object: 'OBJET', designation: 'DÉSIGNATION', quantity: 'QTÉ', unit: 'UNITÉ', unitPrice: 'P.U. HT', tax: us ? 'TAXE' : 'TVA', total: 'TOTAL HT', grandTotal: 'TOTAL TTC', grandTotalExempt: 'TOTAL', labourRate: 'Main-d’œuvre facturée au taux horaire indiqué (HT, TVA en sus), par heure de travail sur place.', replacedParts: 'Le client peut conserver les pièces, éléments ou appareils remplacés.',
    totalExLabel: 'Total HT', netEx: 'Net HT', vat: us ? 'TAXE' : 'TVA', notApplicable: 'Non applicable', discount: 'Remise', companyIdentifier: us ? 'IDENTIFIANT ENTREPRISE' : gb ? 'NUMÉRO D’ENTREPRISE' : 'SIRET', vatExemption: country === 'FR' ? 'TVA non applicable, art. 293 B du CGI' : us ? 'Taxe non applicable' : 'TVA exonérée', deposit: 'Acompte à la commande', duration: 'Durée estimée', payment: 'MODALITÉS DE PAIEMENT', conditions: 'CONDITIONS', notes: 'NOTES',
    acceptance: invoice ? 'RÈGLEMENT' : 'BON POUR ACCORD',
    acceptanceText: invoice
      ? 'Montant à régler à la date indiquée ci-dessus.'
      : "À retourner daté et signé, avec la mention manuscrite « Bon pour accord ».",
    date: 'Date', signature: 'Nom et signature du client',
    validUntil: 'Valable jusqu\'au', issued: 'Émis le', offerValid: 'Offre valable jusqu\'au',
    signedElectronically: 'Accepté et signé en ligne',
    acceptedBy: 'ACCEPTÉ PAR',
    electronicNotice: 'Acceptation électronique enregistrée par DEVISERA : nom, date et tracé, liés à ce devis exact.',
    signedOn: 'le', paid: 'Déjà réglé', balance: 'Restant dû', dueOn: 'À régler avant le',
    paymentDetails: 'COORDONNÉES DE RÈGLEMENT', settled: 'FACTURE ACQUITTÉE',
  };
}

export interface QuotePdfCompany {
  name: string;
  /** Coordonnées de règlement imprimées sur la facture (IBAN, ordre du chèque). */
  paymentDetails?: string | null;
  ownerName?: string | null;
  addressLine1?: string | null;
  postalCode?: string | null;
  city?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  siret?: string | null;
  vatNumber?: string | null;
  insurance?: string | null;
  brandColor?: string | null;
  logo?: { bytes: Uint8Array; mimeType: string } | null;
  vatExempt?: boolean;
}

export interface QuotePdfCustomer {
  name: string;
  addressLine1?: string | null;
  postalCode?: string | null;
  city?: string | null;
  email?: string | null;
  phone?: string | null;
}

export interface QuotePdfLine {
  label: string;
  description?: string | null;
  unit: string;
  quantity: number;
  unitPriceCents: number;
  discountRate: number;
  vatRate: number;
  lineTotalCents: number;
}

/** Modèles de mise en page proposés à l'artisan. */
export type PdfTemplate = 'MINIMAL' | 'MODERNE' | 'EXECUTIF';

/**
 * Signature apposée par le client, rendue sur le document accepté.
 *
 * `strokePath` est un chemin SVG normalisé dans un carré de 1000 × 400, validé
 * côté serveur avant d'arriver ici. La mention imprimée reste « acceptation
 * électronique » : ce n'est pas une signature qualifiée eIDAS.
 */
export interface PdfSignature {
  signerName: string;
  signedAt: Date;
  strokePath: string;
}

export interface QuotePdfInput {
  /** Devis par défaut ; « invoice » bascule les libellés et les totaux. */
  document?: 'quote' | 'invoice';
  template?: PdfTemplate;
  signature?: PdfSignature | null;
  /** Facture : déjà encaissé et restant dû. */
  paidCents?: number;
  dueAt?: Date | null;
  number: string;
  title: string;
  summary?: string | null;
  introduction?: string | null;
  createdAt: Date;
  validUntil?: Date | null;
  company: QuotePdfCompany;
  customer: QuotePdfCustomer;
  lines: QuotePdfLine[];
  workDescription?: string[];
  subtotalCents: number;
  discountRate: number;
  discountCents: number;
  netSubtotalCents: number;
  vatBreakdown: { rate: number; baseCents: number; vatCents: number }[];
  vatCents: number;
  totalCents: number;
  depositCents: number;
  estimatedDurationMin?: number | null;
  notes?: string | null;
  terms?: string | null;
  paymentTerms?: string | null;
  footer?: string | null;
  language?: string;
  country?: string;
  currency?: string;
}

function hexToRgb(hex: string | null | undefined) {
  if (!hex) return rgb(0.059, 0.384, 0.996);
  const clean = hex.replace('#', '');
  const value = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const num = Number.parseInt(value, 16);
  if (Number.isNaN(num)) return rgb(0.059, 0.384, 0.996);
  return rgb(((num >> 16) & 255) / 255, ((num >> 8) & 255) / 255, (num & 255) / 255);
}

interface Ctx {
  template: PdfTemplate;
  doc: PDFDocument;
  page: PDFPage;
  y: number;
  regular: PDFFont;
  bold: PDFFont;
  accent: ReturnType<typeof hexToRgb>;
  pages: PDFPage[];
}

function newPage(ctx: Ctx) {
  ctx.page = ctx.doc.addPage([A4.width, A4.height]);
  ctx.pages.push(ctx.page);
  ctx.y = A4.height - MARGIN;
}

/**
 * Ouvre une page si le bloc à venir ne tient plus.
 *
 * La réserve correspond à la hauteur réelle du pied de page. Trop généreuse,
 * elle envoyait en page 2 des blocs qui tenaient — un devis de quatre lignes
 * sur deux pages fait négligé.
 */
function ensureSpace(ctx: Ctx, needed: number) {
  if (ctx.y - needed < MARGIN + 42) newPage(ctx);
}

/** Découpe un texte pour qu'il tienne dans une largeur donnée. */
function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = safeText(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) current = candidate;
    else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [''];
}

function drawText(
  ctx: Ctx,
  text: string,
  options: {
    x: number;
    y: number;
    size?: number;
    bold?: boolean;
    color?: ReturnType<typeof rgb>;
    /** Sert aux libellés posés sur le bandeau de couleur. */
    opacity?: number;
  },
) {
  ctx.page.drawText(safeText(text), {
    x: options.x,
    y: options.y,
    size: options.size ?? 9.5,
    font: options.bold ? ctx.bold : ctx.regular,
    color: options.color ?? INK,
    opacity: options.opacity,
  });
}

export async function renderQuotePdf(input: QuotePdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`${input.document === 'invoice' ? 'Facture' : 'Devis'} ${input.number} - ${input.company.name}`);
  doc.setAuthor(input.company.name);
  doc.setSubject(input.title);
  doc.setProducer('DEVISERA');
  doc.setCreator('DEVISERA');

  const embedded = loadFonts();
  let regular: PDFFont;
  let bold: PDFFont;
  if (embedded) {
    doc.registerFontkit(fontkit);
    regular = await doc.embedFont(embedded.regular, { subset: true });
    bold = await doc.embedFont(embedded.bold, { subset: true });
  } else {
    const { StandardFonts } = await import('pdf-lib');
    regular = await doc.embedFont(StandardFonts.Helvetica);
    bold = await doc.embedFont(StandardFonts.HelveticaBold);
  }
  const ctx: Ctx = {
    template: input.template ?? 'MODERNE',
    doc,
    page: doc.addPage([A4.width, A4.height]),
    y: A4.height - MARGIN,
    regular,
    bold,
    accent: hexToRgb(input.company.brandColor),
    pages: [],
  };
  ctx.pages.push(ctx.page);

  await drawHeader(ctx, input);
  drawParties(ctx, input);
  drawObject(ctx, input);
  drawLinesTable(ctx, input);
  drawTotals(ctx, input);
  drawConditions(ctx, input);
  drawAcceptance(ctx, input);
  drawFooters(ctx, input);

  return doc.save();
}

/**
 * En-tête du document.
 *
 * L'ancien en-tête était du texte posé sur du blanc : à l'ouverture, on ne
 * voyait rien avant la première ligne du tableau. Un bandeau plein à la
 * couleur de l'entreprise donne au document un point d'ancrage immédiat, y
 * compris en vignette dans une boîte mail.
 *
 * Le logo est placé en haut à droite sur une pastille blanche : c'est là que
 * l'œil se pose en premier sur un document professionnel, et le fond blanc
 * garantit qu'un logo sombre reste lisible quelle que soit la couleur choisie.
 */
async function drawHeader(ctx: Ctx, input: QuotePdfInput) {
  const labels = quotePdfLabels(input);
  const minimal = ctx.template === 'MINIMAL';
  const bandHeight = minimal ? 0 : 128;

  let logoImage: PDFImage | null = null;
  if (input.company.logo) {
    try {
      logoImage = input.company.logo.mimeType.includes('png')
        ? await ctx.doc.embedPng(input.company.logo.bytes)
        : await ctx.doc.embedJpg(input.company.logo.bytes);
    } catch {
      logoImage = null;
    }
  }

  // Modèle Moderne et Exécutif : bandeau plein bord à bord.
  if (!minimal) {
    ctx.page.drawRectangle({
      x: 0,
      y: A4.height - bandHeight,
      width: A4.width,
      height: bandHeight,
      color: ctx.template === 'EXECUTIF' ? INK : ctx.accent,
    });
  }

  const bandInk = minimal ? INK : WHITE;
  const bandMuted = minimal ? MUTED : rgb(1, 1, 1);
  const top = minimal ? A4.height - MARGIN : A4.height - 34;

  // Type de document, en très gros : « DEVIS » ou « FACTURE ».
  drawText(ctx, labels.title, {
    x: MARGIN,
    y: top - 26,
    size: 27,
    bold: true,
    color: bandInk,
  });
  drawText(ctx, safeText(input.number), {
    x: MARGIN,
    y: top - 48,
    size: 12,
    bold: true,
    color: bandMuted,
    opacity: minimal ? 1 : 0.9,
  });

  // Dates alignées à gauche sous le numéro, en deux colonnes serrées.
  const dates: [string, string][] = [[labels.issued, formatDate(input.createdAt, input)]];
  if (input.document === 'invoice' && input.dueAt) dates.push([labels.dueOn, formatDate(input.dueAt, input)]);
  else if (input.validUntil) dates.push([labels.validUntil, formatDate(input.validUntil, input)]);

  dates.forEach(([label, value], index) => {
    const x = MARGIN + index * 168;
    drawText(ctx, label.toUpperCase(), {
      x,
      y: top - 72,
      size: 6.5,
      bold: true,
      color: bandMuted,
      opacity: minimal ? 0.75 : 0.72,
    });
    drawText(ctx, value, { x, y: top - 85, size: 9.5, color: bandInk, opacity: minimal ? 1 : 0.95 });
  });

  // Logo en haut à droite, sur pastille blanche pour rester lisible.
  const plateSize = 64;
  const plateX = A4.width - MARGIN - plateSize;
  const plateY = top - plateSize + 8;
  if (logoImage) {
    if (!minimal) {
      ctx.page.drawRectangle({
        x: plateX - 6,
        y: plateY - 6,
        width: plateSize + 12,
        height: plateSize + 12,
        color: WHITE,
      });
    }
    const scale = Math.min(plateSize / logoImage.width, plateSize / logoImage.height);
    const width = logoImage.width * scale;
    const height = logoImage.height * scale;
    ctx.page.drawImage(logoImage, {
      x: plateX + (plateSize - width) / 2,
      y: plateY + (plateSize - height) / 2,
      width,
      height,
    });
  } else {
    // Sans logo, le nom de l'entreprise tient le coin droit.
    const name = safeText(input.company.name).toUpperCase();
    const size = name.length > 26 ? 10 : 13;
    drawText(ctx, name, {
      x: A4.width - MARGIN - ctx.bold.widthOfTextAtSize(name, size),
      y: top - 26,
      size,
      bold: true,
      color: bandInk,
    });
  }

  ctx.y = minimal ? top - 108 : A4.height - bandHeight - 26;

  if (minimal) {
    ctx.page.drawLine({
      start: { x: MARGIN, y: ctx.y + 12 },
      end: { x: A4.width - MARGIN, y: ctx.y + 12 },
      thickness: 1.4,
      color: INK,
    });
    ctx.y -= 6;
  }
}

function drawParties(ctx: Ctx, input: QuotePdfInput) {
  const colWidth = (CONTENT_WIDTH - 24) / 2;
  const startY = ctx.y;

  const companyLines = [
    input.company.name,
    input.company.ownerName,
    input.company.addressLine1,
    [input.company.postalCode, input.company.city].filter(Boolean).join(' '),
    input.company.phone,
    input.company.email,
    input.company.website,
  ].filter(Boolean) as string[];

  const customerLines = [
    input.customer.name,
    input.customer.addressLine1,
    [input.customer.postalCode, input.customer.city].filter(Boolean).join(' '),
    input.customer.email,
    input.customer.phone,
  ].filter(Boolean) as string[];

  const labels = quotePdfLabels(input);
  drawText(ctx, labels.company, { x: MARGIN, y: startY, size: 7.5, bold: true, color: MUTED });
  drawText(ctx, labels.customer, { x: MARGIN + colWidth + 24, y: startY, size: 7.5, bold: true, color: MUTED });

  let leftY = startY - 14;
  for (const [index, line] of companyLines.entries()) {
    drawText(ctx, line, { x: MARGIN, y: leftY, size: index === 0 ? 10 : 9, bold: index === 0 });
    leftY -= index === 0 ? 14 : 12;
  }

  let rightY = startY - 14;
  for (const [index, line] of customerLines.entries()) {
    drawText(ctx, line, {
      x: MARGIN + colWidth + 24,
      y: rightY,
      size: index === 0 ? 10 : 9,
      bold: index === 0,
    });
    rightY -= index === 0 ? 14 : 12;
  }

  ctx.y = Math.min(leftY, rightY) - 12;
}

/**
 * Objet du devis : une ligne, en gras, sous une étiquette discrète. Le
 * résumé n'apparaît que s'il est court et distinct de l'objet ; le détail des
 * travaux est dans le tableau, jamais répété ici.
 */
function drawObject(ctx: Ctx, input: QuotePdfInput) {
  ensureSpace(ctx, 70);
  drawText(ctx, quotePdfLabels(input).object, { x: MARGIN, y: ctx.y, size: 7.5, bold: true, color: MUTED });
  ctx.y -= 16;
  const titleLines = wrap(input.title.replace(/\s+/g, ' ').trim(), ctx.bold, 13.5, CONTENT_WIDTH).slice(0, 2);
  for (const line of titleLines) {
    drawText(ctx, line, { x: MARGIN, y: ctx.y, size: 13.5, bold: true });
    ctx.y -= 17;
  }

  const intro = (input.introduction || input.summary || '').replace(/\s+/g, ' ').trim();
  const distinct = intro && intro.toLowerCase() !== input.title.trim().toLowerCase();
  if (distinct) {
    ctx.y -= 1;
    for (const line of wrap(intro, ctx.regular, 9.5, CONTENT_WIDTH).slice(0, 3)) {
      ensureSpace(ctx, 20);
      drawText(ctx, line, { x: MARGIN, y: ctx.y, size: 9.5, color: MUTED });
      ctx.y -= 12.5;
    }
  }

  if (input.workDescription && input.workDescription.length > 0) {
    ctx.y -= 6;
    for (const item of input.workDescription.slice(0, 10)) {
      const lines = wrap(item, ctx.regular, 9.5, CONTENT_WIDTH - 14);
      ensureSpace(ctx, lines.length * 12 + 8);
      ctx.page.drawCircle({ x: MARGIN + 3, y: ctx.y + 3, size: 1.6, color: ctx.accent });
      for (const [index, line] of lines.entries()) {
        drawText(ctx, line, { x: MARGIN + 14, y: ctx.y - index * 12, size: 9.5 });
      }
      ctx.y -= lines.length * 12 + 2;
    }
  }
  ctx.y -= 14;
}

const COLUMNS = {
  label: MARGIN + 8,
  quantity: MARGIN + 238,
  unit: MARGIN + 277,
  unitPrice: MARGIN + 323,
  vat: MARGIN + 389,
  total: A4.width - MARGIN - 8,
};

function drawTableHeader(ctx: Ctx, input: QuotePdfInput) {
  ctx.page.drawRectangle({
    x: MARGIN,
    y: ctx.y - 6,
    width: CONTENT_WIDTH,
    height: 22,
    color: SOFT,
  });
  const y = ctx.y + 1;
  const labels = quotePdfLabels(input);
  drawText(ctx, labels.designation, { x: COLUMNS.label, y, size: 7.5, bold: true, color: MUTED });
  drawRight(ctx, labels.quantity, COLUMNS.quantity + 26, y, 7.5, true, MUTED);
  drawText(ctx, labels.unit, { x: COLUMNS.unit, y, size: 7.5, bold: true, color: MUTED });
  drawRight(ctx, labels.unitPrice, COLUMNS.unitPrice + 50, y, 7.5, true, MUTED);
  drawRight(ctx, labels.tax, COLUMNS.vat + 30, y, 7.5, true, MUTED);
  drawRight(ctx, labels.total, COLUMNS.total, y, 7.5, true, MUTED);
  ctx.y -= 21;
}

function drawRight(
  ctx: Ctx,
  text: string,
  right: number,
  y: number,
  size = 9.5,
  isBold = false,
  color = INK,
) {
  const font = isBold ? ctx.bold : ctx.regular;
  const value = safeText(text);
  ctx.page.drawText(value, {
    x: right - font.widthOfTextAtSize(value, size),
    y,
    size,
    font,
    color,
  });
}

function drawLinesTable(ctx: Ctx, input: QuotePdfInput) {
  ensureSpace(ctx, 80);
  drawTableHeader(ctx, input);

  for (const line of input.lines) {
    const labelLines = wrap(line.label, ctx.bold, 9.5, 220);
    // Une prestation par ligne : les tâches séparées par « · » ou un retour
    // se lisent comme une liste, pas comme un paragraphe.
    const descLines = line.description
      ? line.description.split(/\n|\s·\s/).map((part) => part.trim()).filter(Boolean).flatMap((part) => wrap(part, ctx.regular, 8.5, 220))
      : [];
    const height = labelLines.length * 12 + descLines.length * 10.5 + 12;

    if (ctx.y - height < MARGIN + 80) {
      newPage(ctx);
      drawTableHeader(ctx, input);
    }

    const rowTop = ctx.y;
    for (const [index, text] of labelLines.entries()) {
      drawText(ctx, text, { x: COLUMNS.label, y: rowTop - index * 12, size: 9.5, bold: true });
    }
    let descY = rowTop - labelLines.length * 12;
    for (const text of descLines) {
      drawText(ctx, text, { x: COLUMNS.label, y: descY, size: 8.5, color: MUTED });
      descY -= 10.5;
    }

    drawRight(ctx, formatQuantity(line.quantity), COLUMNS.quantity + 26, rowTop);
    drawText(ctx, line.unit, { x: COLUMNS.unit, y: rowTop, size: 8, color: MUTED });
    drawRight(ctx, money(line.unitPriceCents, input), COLUMNS.unitPrice + 50, rowTop, 8);
    drawRight(ctx, input.company.vatExempt ? '-' : formatPercent(line.vatRate), COLUMNS.vat + 30, rowTop, 8);
    drawRight(ctx, money(line.lineTotalCents, input), COLUMNS.total, rowTop, 8, true);

    if (line.discountRate > 0) {
      drawText(ctx, `${quotePdfLabels(input).discount} ${formatPercent(line.discountRate)}`, {
        x: COLUMNS.label,
        y: descY,
        size: 8.5,
        color: MUTED,
      });
      descY -= 10.5;
    }

    ctx.y = rowTop - height + 4;
    ctx.page.drawLine({
      start: { x: MARGIN, y: ctx.y + 4 },
      end: { x: A4.width - MARGIN, y: ctx.y + 4 },
      thickness: 0.5,
      color: LINE,
    });
    ctx.y -= 8;
  }
}

/**
 * Bloc des totaux.
 *
 * C'est le seul endroit du document que tout le monde lit. Il est donc
 * dessiné comme un bloc plein, aligné à droite, avec le total dans une bande
 * à la couleur de l'entreprise : on le trouve sans chercher, même en
 * diagonale sur un téléphone.
 */
function drawTotals(ctx: Ctx, input: QuotePdfInput) {
  const labels = quotePdfLabels(input);
  const rows: { label: string; value: string }[] = [
    { label: labels.totalExLabel, value: money(input.subtotalCents, input) },
  ];
  if (input.discountCents > 0) {
    rows.push({
      label: `${labels.discount} ${formatPercent(input.discountRate)}`,
      value: `- ${money(input.discountCents, input)}`,
    });
    rows.push({ label: labels.netEx, value: money(input.netSubtotalCents, input) });
  }
  if (input.company.vatExempt) {
    rows.push({ label: labels.vat, value: labels.notApplicable });
  } else {
    for (const bucket of input.vatBreakdown.filter((b) => b.baseCents !== 0)) {
      rows.push({ label: `${labels.vat} ${formatPercent(bucket.rate)}`, value: money(bucket.vatCents, input) });
    }
  }

  const ROW = 15;
  const GRAND = 34;
  const boxWidth = 250;
  const boxX = A4.width - MARGIN - boxWidth;
  const bodyHeight = rows.length * ROW + 12;
  const total = bodyHeight + GRAND;
  ensureSpace(ctx, total + 16);

  const topY = ctx.y - 4;

  // Corps : fond très clair, une ligne par poste.
  ctx.page.drawRectangle({
    x: boxX,
    y: topY - bodyHeight,
    width: boxWidth,
    height: bodyHeight,
    color: SOFT,
  });

  let y = topY - 17;
  for (const row of rows) {
    drawText(ctx, row.label, { x: boxX + 14, y, size: 9.5, color: MUTED });
    drawRight(ctx, row.value, A4.width - MARGIN - 14, y, 9.5, false);
    y -= ROW;
  }

  // Bande du total : la couleur de l'entreprise, texte blanc.
  const grandY = topY - bodyHeight - GRAND;
  const strong = ctx.template === 'EXECUTIF' ? INK : ctx.accent;
  ctx.page.drawRectangle({ x: boxX, y: grandY, width: boxWidth, height: GRAND, color: strong });
  drawText(ctx, input.company.vatExempt ? labels.grandTotalExempt : labels.grandTotal, {
    x: boxX + 14,
    y: grandY + 13,
    size: 9.5,
    bold: true,
    color: WHITE,
  });
  drawRight(ctx, money(input.totalCents, input), A4.width - MARGIN - 14, grandY + 11, 14.5, true, WHITE);

  // Acompte et durée : posés à gauche, en regard du bloc, sans l'alourdir.
  let leftY = topY - 17;
  if (input.depositCents > 0) {
    drawText(ctx, labels.deposit.toUpperCase(), { x: MARGIN, y: leftY, size: 6.5, bold: true, color: MUTED });
    drawText(ctx, money(input.depositCents, input), { x: MARGIN, y: leftY - 15, size: 12, bold: true, color: strong });
    leftY -= 36;
  }
  if (input.estimatedDurationMin) {
    const hours = Math.round((input.estimatedDurationMin / 60) * 10) / 10;
    drawText(ctx, `${labels.duration} : ${formatQuantity(hours)} h`, {
      x: MARGIN,
      y: leftY,
      size: 9,
      color: MUTED,
    });
  }

  ctx.y = grandY - 22;
}

function drawConditions(ctx: Ctx, input: QuotePdfInput) {
  const labels = quotePdfLabels(input);
  const blocks: { title: string; body: string }[] = [];
  if ((input.country ?? 'FR').toUpperCase() === 'FR' && input.language !== 'en') {
    // Mentions attendues pour des travaux et dépannages (arrêté du 24 janvier
    // 2017, art. L.111-1 du code de la consommation) : taux horaire de
    // main-d'œuvre et sort des pièces remplacées.
    const mentions = [
      input.lines.some((line) => /^h(?:eure)?s?$/i.test(line.unit.trim())) ? labels.labourRate : null,
      labels.replacedParts,
    ].filter((item): item is string => Boolean(item));
    blocks.push({ title: labels.conditions, body: mentions.join(' ') });
  }
  if (input.paymentTerms) blocks.push({ title: labels.payment, body: input.paymentTerms });
  if (input.terms) blocks.push({ title: labels.conditions, body: input.terms });
  if (input.notes) blocks.push({ title: labels.notes, body: input.notes });

  for (const block of blocks) {
    const lines = wrap(block.body, ctx.regular, 8.5, CONTENT_WIDTH);
    ensureSpace(ctx, lines.length * 11 + 26);
    drawText(ctx, block.title, { x: MARGIN, y: ctx.y, size: 7.5, bold: true, color: MUTED });
    ctx.y -= 13;
    for (const line of lines) {
      drawText(ctx, line, { x: MARGIN, y: ctx.y, size: 8.5, color: INK });
      ctx.y -= 11;
    }
    ctx.y -= 10;
  }
}

/**
 * Boîte englobante d'un chemin de signature.
 *
 * On ne lit que les couples de nombres : pour `Q`, le point de contrôle n'est
 * pas sur la courbe, donc la boîte est légèrement plus large que le tracé
 * réel. C'est la bonne erreur — une marge en trop, jamais un trait coupé.
 */
function strokeBounds(strokePath: string): { x: number; y: number; width: number; height: number } | null {
  const numbers = strokePath.match(/-?\d+(?:\.\d+)?/g);
  if (!numbers || numbers.length < 4) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let index = 0; index + 1 < numbers.length; index += 2) {
    const x = Number(numbers[index]);
    const y = Number(numbers[index + 1]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const width = maxX - minX;
  const height = maxY - minY;
  if (width <= 0 && height <= 0) return null;
  return { x: minX, y: minY, width, height };
}

/**
 * Rend le tracé de signature du client.
 *
 * Le chemin arrive normalisé dans un repère de 1000 × 400. Le mettre à
 * l'échelle de ce repère donnait des signatures minuscules perdues en haut de
 * leur case : personne ne signe en remplissant tout le cadre. On cadre donc
 * sur la **boîte englobante du tracé**, centrée dans la case, avec un
 * plafond d'agrandissement pour qu'un paraphe de trois centimètres ne
 * devienne pas une fresque.
 *
 * pdf-lib accepte un chemin SVG tel quel : le trait reste net à l'impression,
 * là où une image matricielle baverait.
 */
const MAX_SIGNATURE_SCALE = 0.42;

function drawSignatureStroke(
  ctx: Ctx,
  strokePath: string,
  box: { x: number; y: number; width: number; height: number },
) {
  const bounds = strokeBounds(strokePath);
  if (!bounds) return;
  const scale = Math.min(
    MAX_SIGNATURE_SCALE,
    bounds.width > 0 ? box.width / bounds.width : Infinity,
    bounds.height > 0 ? box.height / bounds.height : Infinity,
  );
  if (!Number.isFinite(scale) || scale <= 0) return;

  const inkWidth = bounds.width * scale;
  const inkHeight = bounds.height * scale;
  // pdf-lib place l'origine d'un chemin SVG en haut à gauche, et l'axe y
  // descend : le haut de la case est `y + height`, et on décale de la
  // position du tracé dans son repère.
  const left = box.x + (box.width - inkWidth) / 2 - bounds.x * scale;
  const top = box.y + box.height - (box.height - inkHeight) / 2 + bounds.y * scale;

  try {
    ctx.page.drawSvgPath(strokePath, {
      x: left,
      y: top,
      scale,
      borderColor: INK,
      // Le trait garde une épaisseur lisible quel que soit l'agrandissement.
      borderWidth: Math.max(0.9, Math.min(2, 5 * scale)),
      borderLineCap: LineCapStyle.Round,
      color: undefined,
    });
  } catch {
    // Un tracé illisible ne doit jamais empêcher le document de sortir.
  }
}

function drawAcceptance(ctx: Ctx, input: QuotePdfInput) {
  const labels = quotePdfLabels(input);
  const invoice = input.document === 'invoice';

  // Facture : pas de case à signer, mais l'état du règlement.
  if (invoice) {
    const paid = input.paidCents ?? 0;
    const balance = Math.max(0, input.totalCents - input.depositCents - paid);
    const rows: [string, string][] = [];
    if (input.depositCents > 0) rows.push([labels.deposit, money(input.depositCents, input)]);
    if (paid > 0) rows.push([labels.paid, money(paid, input)]);
    rows.push([labels.balance, money(balance, input)]);

    ensureSpace(ctx, 40 + rows.length * 16);
    const height = 30 + rows.length * 16;
    const boxY = ctx.y - height;
    ctx.page.drawRectangle({
      x: MARGIN,
      y: boxY,
      width: CONTENT_WIDTH,
      height,
      color: balance === 0 ? rgb(0.941, 0.98, 0.949) : SOFT,
      borderColor: LINE,
      borderWidth: 0.8,
    });
    drawText(ctx, balance === 0 ? labels.settled : labels.acceptance, {
      x: MARGIN + 14,
      y: boxY + height - 18,
      size: 8,
      bold: true,
      color: balance === 0 ? rgb(0.086, 0.51, 0.271) : MUTED,
    });
    rows.forEach(([label, value], index) => {
      const y = boxY + height - 36 - index * 16;
      const last = index === rows.length - 1;
      drawText(ctx, label, { x: MARGIN + 14, y, size: last ? 10 : 9, bold: last, color: last ? INK : MUTED });
      const text = safeText(value);
      const font = last ? ctx.bold : ctx.regular;
      drawText(ctx, value, {
        x: A4.width - MARGIN - 14 - font.widthOfTextAtSize(text, last ? 10 : 9),
        y,
        size: last ? 10 : 9,
        bold: last,
      });
    });
    if (input.dueAt && balance > 0) {
      drawText(ctx, `${labels.dueOn} ${formatDate(input.dueAt, input)}.`, {
        x: MARGIN + 14,
        y: boxY + 8,
        size: 8,
        color: MUTED,
      });
    }
    ctx.y = boxY - 16;

    if (input.company.paymentDetails) {
      ensureSpace(ctx, 44);
      drawText(ctx, labels.paymentDetails, { x: MARGIN, y: ctx.y, size: 8, bold: true, color: MUTED });
      ctx.y -= 13;
      for (const line of wrap(safeText(input.company.paymentDetails), ctx.regular, 8.5, CONTENT_WIDTH)) {
        ensureSpace(ctx, 12);
        drawText(ctx, line, { x: MARGIN, y: ctx.y, size: 8.5, color: MUTED });
        ctx.y -= 11;
      }
      ctx.y -= 8;
    }
    return;
  }

  /*
   * Le bloc de signature.
   *
   * C'est la partie du document qu'un client regarde en dernier et dont il se
   * souvient : elle mérite d'être dessinée, pas expédiée en une ligne. Deux
   * états, une seule structure — un cadre titré, une zone de tracé, et sous
   * elle le nom et la date.
   *
   * Signé : la signature manuscrite est imprimée à sa taille, avec le nom du
   * signataire et l'horodatage sous la ligne, comme sur un document papier.
   * Non signé : la même zone reste vide avec sa ligne et ses intitulés, prête
   * à être signée à la main si le client préfère imprimer.
   *
   * La couleur de l'encadré vient de la marque de l'artisan, jamais de celle
   * de DEVISERA : ce document part chez *son* client, sous *son* nom.
   */
  const signature = input.signature;
  const strong = ctx.template === 'EXECUTIF' ? INK : ctx.accent;
  const height = 122;
  ensureSpace(ctx, height + 16);
  const boxY = ctx.y - height;

  ctx.page.drawRectangle({
    x: MARGIN,
    y: boxY,
    width: CONTENT_WIDTH,
    height,
    color: WHITE,
    borderColor: signature ? strong : LINE,
    borderWidth: signature ? 1.1 : 0.8,
  });

  // Onglet de titre : le bloc se lit comme une zone à part, pas comme une
  // dernière ligne du document.
  const tabLabel = signature ? labels.signedElectronically : labels.acceptance;
  const tabWidth = ctx.bold.widthOfTextAtSize(safeText(tabLabel), 7.5) + 20;
  ctx.page.drawRectangle({
    x: MARGIN,
    y: boxY + height - 19,
    width: tabWidth,
    height: 19,
    color: signature ? strong : SOFT,
  });
  drawText(ctx, tabLabel, {
    x: MARGIN + 10,
    y: boxY + height - 13,
    size: 7.5,
    bold: true,
    color: signature ? WHITE : MUTED,
  });

  /*
   * Deux colonnes, comme sur un bon de commande : à gauche ce que le client
   * doit écrire ou a écrit, à droite la signature elle-même. La colonne de
   * droite est la plus large — c'est le geste, pas la mention, qui compte.
   */
  const leftX = MARGIN + 16;
  const rightX = MARGIN + 236;
  const rightWidth = CONTENT_WIDTH - 236 - 16;
  /*
   * Ligne de signature : la même dans les deux états, pour que le document
   * vide et le document signé se ressemblent.
   *
   * Elle est posée assez haut pour que les intitulés qui la suivent et la
   * mention légale du bas ne se touchent pas — à 34 points du bord, les deux
   * se collaient et la mention semblait légender la date.
   */
  const ruleY = boxY + 42;

  drawText(ctx, labels.signature.toUpperCase(), {
    x: rightX,
    y: ruleY - 13,
    size: 6.5,
    bold: true,
    color: MUTED,
  });
  ctx.page.drawLine({
    start: { x: rightX, y: ruleY },
    end: { x: rightX + rightWidth, y: ruleY },
    thickness: 0.8,
    color: signature ? strong : LINE,
    opacity: signature ? 0.55 : 1,
  });

  drawText(ctx, labels.date.toUpperCase(), { x: leftX, y: ruleY - 13, size: 6.5, bold: true, color: MUTED });
  ctx.page.drawLine({
    start: { x: leftX, y: ruleY },
    end: { x: leftX + 180, y: ruleY },
    thickness: 0.8,
    color: signature ? strong : LINE,
    opacity: signature ? 0.55 : 1,
  });

  if (signature) {
    // Le tracé occupe l'espace entre l'onglet et la ligne.
    drawSignatureStroke(ctx, signature.strokePath, {
      x: rightX,
      y: ruleY + 4,
      width: rightWidth,
      height: height - 19 - 34 - 10,
    });

    const signedAt = formatDate(signature.signedAt, input);
    drawText(ctx, signedAt, { x: leftX, y: ruleY + 8, size: 11, bold: true });

    drawText(ctx, safeText(signature.signerName), {
      x: leftX,
      y: boxY + height - 47,
      size: 12.5,
      bold: true,
    });
    drawText(ctx, labels.acceptedBy, {
      x: leftX,
      y: boxY + height - 34,
      size: 6.5,
      bold: true,
      color: MUTED,
    });
    /*
     * Ce que vaut cette acceptation, dit sur le document lui-même — en petit
     * et en gris. C'est une mention, pas une signature de DEVISERA : le
     * document part chez le client de l'artisan, sous le nom de l'artisan.
     */
    drawText(ctx, labels.electronicNotice, {
      x: leftX,
      y: boxY + 11,
      size: 6.5,
      color: MUTED,
    });
  } else {
    drawText(ctx, labels.acceptanceText, {
      x: leftX,
      y: boxY + height - 38,
      size: 8.5,
      color: MUTED,
    });
  }

  ctx.y = boxY - 16;
}

function drawFooters(ctx: Ctx, input: QuotePdfInput) {
  const labels = quotePdfLabels(input);
  const legal = [
    input.company.siret ? `${labels.companyIdentifier} ${input.company.siret}` : null,
    input.company.vatNumber ? `${labels.vat} ${input.company.vatNumber}` : null,
    input.company.vatExempt ? labels.vatExemption : null,
    input.company.insurance,
    input.footer,
  ]
    .filter(Boolean)
    .join('  -  ');

  ctx.pages.forEach((page, index) => {
    if (legal) {
      const lines = wrap(legal, ctx.regular, 7.5, CONTENT_WIDTH);
      lines.slice(0, 2).forEach((line, lineIndex) => {
        page.drawText(safeText(line), {
          x: MARGIN,
          y: 34 - lineIndex * 9,
          size: 7.5,
          font: ctx.regular,
          color: MUTED,
        });
      });
    }
    const pagination = `${index + 1} / ${ctx.pages.length}`;
    page.drawText(pagination, {
      x: A4.width - MARGIN - ctx.regular.widthOfTextAtSize(pagination, 7.5),
      y: 34,
      size: 7.5,
      font: ctx.regular,
      color: MUTED,
    });
  });
}

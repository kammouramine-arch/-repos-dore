import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type PDFImage } from 'pdf-lib';
import { centsToEuros, formatPercent, formatQuantity } from '../money';

/**
 * Génération du PDF de devis.
 *
 * Mise en page sobre et dense en information, pensée pour être envoyée telle
 * quelle à un client. Les polices standard (Helvetica) évitent d'embarquer une
 * fonte : le PDF reste léger et s'ouvre partout.
 */

const A4 = { width: 595.28, height: 841.89 };
const MARGIN = 46;
const CONTENT_WIDTH = A4.width - MARGIN * 2;

const INK = rgb(0.043, 0.059, 0.078);
const MUTED = rgb(0.357, 0.396, 0.447);
const LINE = rgb(0.898, 0.91, 0.925);
const SOFT = rgb(0.973, 0.976, 0.98);

/** CP1252 ne couvre pas tous les caractères typographiques : on les normalise. */
function safeText(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .replace(new RegExp('[\\u202f\\u00a0\\u2009\\u2007]', 'g'), ' ')
    .replace(new RegExp('[\\u2018\\u2019\\u201b]', 'g'), "'")
    .replace(new RegExp('[\\u201c\\u201d]', 'g'), '"')
    .replace(new RegExp('[\\u2013\\u2014]', 'g'), '-')
    .replace(new RegExp('[\\u2026]', 'g'), '...')
    .replace(new RegExp('[\\u00ad]', 'g'), '')
    .replace(new RegExp('[^\\u0020-\\u00ff\\u0152\\u0153\\u20ac]', 'g'), '');
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

export function quotePdfLabels(input: Pick<QuotePdfInput, 'language' | 'country'>) {
  const english = input.language === 'en';
  const us = input.country === 'US';
  return english ? {
    title: us ? 'ESTIMATE' : 'QUOTE', company: 'COMPANY', customer: 'CUSTOMER', object: 'DESCRIPTION',
    designation: 'DESCRIPTION', quantity: 'QTY', unit: 'UNIT', unitPrice: 'UNIT PRICE', tax: us ? 'Sales tax' : 'VAT', totalEx: 'TOTAL',
    totalExLabel: 'Subtotal', netEx: 'Net subtotal', vat: 'VAT', notApplicable: 'Not applicable', total: 'TOTAL',
    deposit: 'Deposit due', duration: 'Estimated duration', payment: 'PAYMENT TERMS', conditions: 'TERMS', notes: 'NOTES',
    acceptance: 'ACCEPTANCE', acceptanceText: 'Please sign and return this quote to confirm.', date: 'Date', signature: 'Customer name and signature',
    validUntil: 'Valid until', issued: 'Issued', offerValid: 'Offer valid until',
  } : {
    title: 'DEVIS', company: 'ENTREPRISE', customer: 'CLIENT', object: 'OBJET', designation: 'DÉSIGNATION', quantity: 'QTÉ', unit: 'UNITÉ', unitPrice: 'P.U. HT', tax: 'TVA', total: 'TOTAL HT',
    totalExLabel: 'Total HT', netEx: 'Net HT', vat: 'TVA', notApplicable: 'Non applicable', totalEx: 'Total HT', deposit: 'Acompte à la commande', duration: 'Durée estimée', payment: 'MODALITÉS DE PAIEMENT', conditions: 'CONDITIONS', notes: 'NOTES',
    acceptance: 'BON POUR ACCORD', acceptanceText: "À retourner daté et signé, avec la mention manuscrite « Bon pour accord ».", date: 'Date', signature: 'Nom et signature du client', validUntil: 'Valable jusqu\'au', issued: 'Émis le', offerValid: 'Offre valable jusqu\'au',
  };
}

export interface QuotePdfCompany {
  name: string;
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

export interface QuotePdfInput {
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

function ensureSpace(ctx: Ctx, needed: number) {
  if (ctx.y - needed < MARGIN + 60) newPage(ctx);
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
  options: { x: number; y: number; size?: number; bold?: boolean; color?: ReturnType<typeof rgb> },
) {
  ctx.page.drawText(safeText(text), {
    x: options.x,
    y: options.y,
    size: options.size ?? 9.5,
    font: options.bold ? ctx.bold : ctx.regular,
    color: options.color ?? INK,
  });
}

export async function renderQuotePdf(input: QuotePdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Devis ${input.number} - ${input.company.name}`);
  doc.setAuthor(input.company.name);
  doc.setSubject(input.title);
  doc.setProducer('DEVISERA');
  doc.setCreator('DEVISERA');

  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const ctx: Ctx = {
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

async function drawHeader(ctx: Ctx, input: QuotePdfInput) {
  const top = ctx.y;
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

  if (logoImage) {
    const maxW = 132;
    const maxH = 46;
    const scale = Math.min(maxW / logoImage.width, maxH / logoImage.height);
    const width = logoImage.width * scale;
    const height = logoImage.height * scale;
    ctx.page.drawImage(logoImage, { x: MARGIN, y: top - height, width, height });
  } else {
    drawText(ctx, input.company.name.toUpperCase(), {
      x: MARGIN,
      y: top - 16,
      size: 15,
      bold: true,
    });
  }

  // Bloc identité du devis, aligné à droite.
  const rightX = A4.width - MARGIN;
  const labels = quotePdfLabels(input);
  const label = labels.title;
  drawText(ctx, label, {
    x: rightX - ctx.bold.widthOfTextAtSize(label, 22),
    y: top - 18,
    size: 22,
    bold: true,
    color: ctx.accent,
  });
  const numberText = safeText(input.number);
  drawText(ctx, numberText, {
    x: rightX - ctx.regular.widthOfTextAtSize(numberText, 10.5),
    y: top - 34,
    size: 10.5,
    color: MUTED,
  });
  const dateText = `${labels.issued} ${formatDate(input.createdAt, input)}`;
  drawText(ctx, dateText, {
    x: rightX - ctx.regular.widthOfTextAtSize(safeText(dateText), 9),
    y: top - 48,
    size: 9,
    color: MUTED,
  });
  if (input.validUntil) {
    const validity = `${labels.validUntil} ${formatDate(input.validUntil, input)}`;
    drawText(ctx, validity, {
      x: rightX - ctx.regular.widthOfTextAtSize(safeText(validity), 9),
      y: top - 60,
      size: 9,
      color: MUTED,
    });
  }

  ctx.y = top - 78;
  ctx.page.drawLine({
    start: { x: MARGIN, y: ctx.y },
    end: { x: A4.width - MARGIN, y: ctx.y },
    thickness: 0.8,
    color: LINE,
  });
  ctx.y -= 22;
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

function drawObject(ctx: Ctx, input: QuotePdfInput) {
  ensureSpace(ctx, 90);
  drawText(ctx, quotePdfLabels(input).object, { x: MARGIN, y: ctx.y, size: 7.5, bold: true, color: MUTED });
  ctx.y -= 15;
  for (const line of wrap(input.title, ctx.bold, 12.5, CONTENT_WIDTH)) {
    drawText(ctx, line, { x: MARGIN, y: ctx.y, size: 12.5, bold: true });
    ctx.y -= 16;
  }

  const intro = input.introduction || input.summary;
  if (intro) {
    ctx.y -= 2;
    for (const line of wrap(intro, ctx.regular, 9.5, CONTENT_WIDTH)) {
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
  ctx.y -= 24;
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
    const descLines = line.description ? wrap(line.description, ctx.regular, 8.5, 220) : [];
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
      drawText(ctx, `Remise ${formatPercent(line.discountRate)}`, {
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

function drawTotals(ctx: Ctx, input: QuotePdfInput) {
  const labels = quotePdfLabels(input);
  const rows: { label: string; value: string; strong?: boolean }[] = [
    { label: labels.totalExLabel, value: money(input.subtotalCents, input) },
  ];
  if (input.discountCents > 0) {
    rows.push({
      label: `Remise ${formatPercent(input.discountRate)}`,
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

  const boxHeight = rows.length * 15 + 46 + (input.depositCents > 0 ? 16 : 0);
  ensureSpace(ctx, boxHeight + 20);

  const boxWidth = 232;
  const boxX = A4.width - MARGIN - boxWidth;
  let y = ctx.y - 6;

  for (const row of rows) {
    drawText(ctx, row.label, { x: boxX, y, size: 9.5, color: MUTED });
    drawRight(ctx, row.value, A4.width - MARGIN, y, 9.5, false);
    y -= 15;
  }

  y -= 4;
  ctx.page.drawRectangle({
    x: boxX - 12,
    y: y - 22,
    width: boxWidth + 12,
    height: 32,
    color: SOFT,
  });
  drawText(ctx, labels.total, { x: boxX, y: y - 12, size: 10.5, bold: true });
  drawRight(ctx, money(input.totalCents, input), A4.width - MARGIN, y - 13, 13, true, ctx.accent);
  y -= 34;

  if (input.depositCents > 0) {
    drawText(ctx, labels.deposit, { x: boxX, y: y - 8, size: 9, color: MUTED });
    drawRight(ctx, money(input.depositCents, input), A4.width - MARGIN, y - 8, 9, true);
    y -= 18;
  }

  if (input.estimatedDurationMin) {
    const hours = Math.round((input.estimatedDurationMin / 60) * 10) / 10;
    drawText(ctx, `${labels.duration}: ${formatQuantity(hours)} h`, {
      x: MARGIN,
      y: ctx.y - 6,
      size: 9,
      color: MUTED,
    });
  }

  ctx.y = y - 14;
}

function drawConditions(ctx: Ctx, input: QuotePdfInput) {
  const labels = quotePdfLabels(input);
  const blocks: { title: string; body: string }[] = [];
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

function drawAcceptance(ctx: Ctx, input: QuotePdfInput) {
  const labels = quotePdfLabels(input);
  ensureSpace(ctx, 108);
  const boxY = ctx.y - 92;
  ctx.page.drawRectangle({
    x: MARGIN,
    y: boxY,
    width: CONTENT_WIDTH,
    height: 92,
    borderColor: LINE,
    borderWidth: 0.8,
    color: rgb(1, 1, 1),
  });
  drawText(ctx, labels.acceptance, {
    x: MARGIN + 14,
    y: boxY + 74,
    size: 8,
    bold: true,
    color: MUTED,
  });
  drawText(
    ctx,
    labels.acceptanceText,
    { x: MARGIN + 14, y: boxY + 58, size: 8.5, color: MUTED },
  );
  drawText(ctx, `${labels.date} : ..........................`, { x: MARGIN + 14, y: boxY + 32, size: 9 });
  drawText(ctx, `${labels.signature} :`, { x: MARGIN + 250, y: boxY + 32, size: 9 });
  ctx.page.drawLine({
    start: { x: MARGIN + 250, y: boxY + 16 },
    end: { x: A4.width - MARGIN - 14, y: boxY + 16 },
    thickness: 0.6,
    color: LINE,
  });
  if (input.validUntil) {
    drawText(ctx, `${labels.offerValid} ${formatDate(input.validUntil, input)}.`, {
      x: MARGIN + 14,
      y: boxY + 12,
      size: 8,
      color: MUTED,
    });
  }
  ctx.y = boxY - 16;
}

function drawFooters(ctx: Ctx, input: QuotePdfInput) {
  const legal = [
    input.company.siret ? `SIRET ${input.company.siret}` : null,
    input.company.vatNumber ? `TVA ${input.company.vatNumber}` : null,
    input.company.vatExempt ? 'TVA non applicable, art. 293 B du CGI' : null,
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

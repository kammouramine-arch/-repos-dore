import { Fragment, type ReactNode } from "react";
import { AmynMark } from "@/components/layout/Logo";
import { Container } from "@/components/ui/Layout";
import { MODULE_GROUPS, getAuditCopy, type AuditCopy } from "@/lib/audit/copy";
import {
  ASSESSMENT_BANDS,
  CATEGORY_MAX,
  CATEGORY_ORDER,
  assessmentOf,
  buildRoadmap,
  opportunityTier,
  opportunityValue,
  rankOpportunities,
  scoreAudit,
  strongestCategory,
} from "@/lib/audit/model";
import type { JourneyStatus, Opportunity, Priority, RevenueAudit } from "@/lib/audit/types";
import { site } from "@/lib/site";
import { AuditToolbar } from "./AuditToolbar";
import { RoiModeller } from "./RoiModeller";

/**
 * Le Revenue Audit, rendu à partir de ses données. Un document : une
 * couverture, puis des sections numérotées, lisibles à l'écran, en
 * présentation (une section par écran) et à l'impression (une section par
 * page, en-têtes et pieds de page).
 */

type Line = { text?: string; accent?: string };

function Lines({ lines }: { lines: Line[] }) {
  return (
    <>
      {lines.map((l, i) => (
        <Fragment key={i}>
          <span className="block">
            {l.text}
            {l.text && l.accent ? " " : null}
            {l.accent && <em className="accent">{l.accent}</em>}
          </span>
        </Fragment>
      ))}
    </>
  );
}

const SECTION_IDS = [
  "summary",
  "scorecard",
  "journey",
  "observations",
  "opportunities",
  "roi",
  "architecture",
  "roadmap",
  "investment",
  "nextStep",
  "sources",
] as const;
type SectionId = (typeof SECTION_IDS)[number];

function AuditSection({
  id,
  t,
  title,
  lead,
  tone = "paper",
  children,
}: {
  id: SectionId;
  t: AuditCopy;
  title: Line[];
  lead?: string;
  tone?: "paper" | "ink";
  children: ReactNode;
}) {
  const n = String(SECTION_IDS.indexOf(id) + 1).padStart(2, "0");
  return (
    <section
      id={id}
      data-audit-section={id}
      aria-labelledby={`${id}-title`}
      className={`audit-section ${tone === "ink" ? "tone-ink audit-ink" : "tone-paper"} relative bg-canvas py-16 sm:py-24`}
    >
      <Container>
        <header className="audit-avoid grid gap-5 border-t border-line pt-6 doc:grid-cols-12 doc:gap-10">
          <p className="label flex items-center gap-3 text-accent doc:col-span-3">
            <span className="font-mono">{n}</span>
            <span aria-hidden className="h-px w-8 bg-current opacity-50" />
            {t.sections[id]}
          </p>
          <div className="doc:col-span-9">
            <h2 id={`${id}-title`} className="text-[clamp(2rem,4.4vw,3.4rem)] font-semibold leading-[1] tracking-[-0.04em] text-fg">
              <Lines lines={title} />
            </h2>
            {lead && <p className="mt-5 max-w-2xl text-[1.05rem] leading-relaxed text-fg-2">{lead}</p>}
          </div>
        </header>
        <div className="mt-12 sm:mt-14">{children}</div>
      </Container>
    </section>
  );
}

/* --- Petits éléments ------------------------------------------------------ */

const badgeTone = {
  observed: "bg-fg text-canvas",
  provided: "border border-fg/60 text-fg",
  hypothesis: "border border-dashed border-fg/50 text-fg-2",
};

function Provenance({ kind, t }: { kind: "observed" | "provided" | "hypothesis"; t: AuditCopy }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.12em] ${badgeTone[kind]}`}>
      {t.provenance[kind].label}
    </span>
  );
}

const PRIORITY_TONE: Record<Priority, string> = {
  critical: "bg-[var(--audit-risk)] text-[#fff8f3]",
  high: "bg-fg text-canvas",
  medium: "border border-fg/50 text-fg",
  future: "border border-dashed border-fg/40 text-fg-2",
};

function PriorityBadge({ p, t }: { p: Priority; t: AuditCopy }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.12em] ${PRIORITY_TONE[p]}`}>
      {t.priority[p]}
    </span>
  );
}

function Refs({ ids, label }: { ids: string[]; label: string }) {
  if (!ids.length) return null;
  const anchor = (id: string) => (id.startsWith("H") ? `#hyp-${id}` : id.startsWith("M") ? `#met-${id}` : `#obs-${id}`);
  return (
    <p className="text-[0.75rem] text-fg-3">
      {label}{" "}
      {ids.map((id, i) => (
        <Fragment key={id}>
          {i > 0 && " · "}
          <a href={anchor(id)} className="font-mono text-fg-2 underline decoration-line-strong underline-offset-2 hover:text-fg">
            {id}
          </a>
        </Fragment>
      ))}
    </p>
  );
}

function Dots({ value, label }: { value: number; label: string }) {
  return (
    <span className="flex items-center justify-between gap-2 text-[0.6875rem] text-fg-3">
      {label}
      <span role="img" aria-label={`${value}/3`} className="flex gap-1">
        {[1, 2, 3].map((d) => (
          <span key={d} className={`size-1.5 rounded-full ${d <= value ? "bg-fg" : "bg-line-strong"}`} />
        ))}
      </span>
    </span>
  );
}

const STATUS_STYLE: Record<JourneyStatus, string> = {
  verified: "border-[var(--audit-gold)] bg-[var(--audit-gold)]",
  needs_validation: "border-dashed border-fg-3 bg-canvas",
  opportunity: "border-[var(--audit-risk)] bg-[var(--audit-risk)]",
};

/* --- Le document ---------------------------------------------------------- */

export function AuditDocument({ audit }: { audit: RevenueAudit }) {
  const t = getAuditCopy(audit.locale);
  const score = scoreAudit(audit.scores);
  const assessment = score.total === null ? null : assessmentOf(score.total);
  const strongest = strongestCategory(audit.scores);
  const ranked = rankOpportunities(audit.opportunities);
  const topOpportunity: Opportunity | undefined = ranked.high[0] ?? ranked.medium[0] ?? ranked.lower[0];
  const roadmap = buildRoadmap(audit.recommendations);
  const recommended = new Map(audit.recommendations.map((r) => [r.module, r]));
  const date = new Date(`${audit.date}T12:00:00Z`).toLocaleDateString(t.dateLocale, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  const sourceById = new Map(audit.sources.map((s) => [s.id, s]));
  const booking = audit.nextStep?.bookingUrl ?? `mailto:${site.email}?subject=${encodeURIComponent(t.nextStep.emailSubject(audit.company.name))}`;

  /* En-têtes et pieds de page du PDF (chaîne CSS échappée). */
  const footer = t.footer(audit.company.name) + (audit.fictional ? ` · ${t.sample}` : "");
  const css = (s: string) => `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  const printCss = `@page{@bottom-left{content:${css(footer)};font:7.5pt/1.2 Helvetica,Arial,sans-serif;color:#6b665e}@bottom-right{content:counter(page) " ${t.pageOf} " counter(pages);font:7.5pt/1.2 Helvetica,Arial,sans-serif;color:#6b665e}}@page:first{margin:0;@bottom-left{content:none}@bottom-right{content:none}}`;

  const sections = SECTION_IDS.map((id) => ({ id, label: t.sections[id] }));

  return (
    <article className="audit" data-audit="" data-fictional={audit.fictional ? "" : undefined}>
      <style>{`@media print{${printCss}}`}</style>
      <AuditToolbar
        sections={sections}
        labels={t.toolbar}
        company={audit.company.name}
        product={t.product}
        fictional={audit.fictional}
        sampleLabel={t.sample}
      />

      {/* Couverture */}
      <header className="audit-cover tone-ink relative flex min-h-[calc(100svh-var(--header-h))] flex-col overflow-hidden bg-[radial-gradient(120%_80%_at_80%_10%,rgb(198_167_106/0.16),transparent_60%),linear-gradient(180deg,#0e0d0b,#0a0a0a)] py-10 sm:py-14">
        <Container className="flex flex-1 flex-col">
          <div className="flex items-start justify-between gap-6">
            <span className="flex items-center gap-3 text-bone">
              <AmynMark className="size-7" />
              <span className="text-[1rem] font-semibold tracking-[0.32em]">{t.brand}</span>
            </span>
            <span className="label text-right text-gold-2">{t.confidential}</span>
          </div>

          <div className="my-auto py-16">
            <p className="label text-gold">{t.brand}</p>
            <h1 className="mt-4 text-[clamp(2.8rem,8vw,6.5rem)] font-semibold leading-[0.9] tracking-[-0.05em] text-bone">
              Revenue Audit<sup className="ml-1 align-super text-[0.3em] font-normal text-gold">™</sup>
            </h1>
            <p className="mt-12 text-[0.9375rem] text-bone-3">{t.preparedFor}</p>
            {audit.company.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={audit.company.logo.src} alt={audit.company.logo.alt} className="mt-4 h-16 w-auto" />
            ) : (
              <p className="mt-3 font-serif text-[clamp(2.6rem,7vw,5.5rem)] leading-[0.95] text-bone">{audit.company.name}</p>
            )}
            <p className="mt-4 text-[1rem] text-bone-2">
              {audit.company.industry} · {audit.company.country}
            </p>
          </div>

          <div className="grid gap-6 border-t border-[rgb(242_238_230/0.14)] pt-6 sm:grid-cols-3">
            <p className="text-[0.875rem] text-bone-2">
              <span className="label block text-bone-3">Date</span>
              {date}
            </p>
            <p className="text-[0.875rem] text-bone-2">
              <span className="label block text-bone-3">{t.preparedBy}</span>
              {audit.preparedBy}
            </p>
            <div>
              {audit.fictional && (
                <p className="rounded-xl border border-gold/50 px-4 py-3 text-[0.8125rem] leading-relaxed text-gold-2">
                  <span className="block font-semibold">{t.sample}</span>
                  <span className="text-bone-3">{t.sampleNote}</span>
                </p>
              )}
              {audit.status === "draft" && <p className="mt-2 text-[0.8125rem] text-[#f3c0b2]">{t.draft}</p>}
            </div>
          </div>
        </Container>
      </header>

      {/* 01 · Synthèse */}
      <AuditSection id="summary" t={t} title={t.summary.title} lead={audit.summary.context}>
        <div className="grid gap-6 doc:grid-cols-12 doc:gap-10">
          <div className="audit-avoid rounded-[1.25rem] border border-line bg-surface p-6 sm:p-8 doc:col-span-5">
            <p className="label text-fg-3">{t.summary.score}</p>
            {score.total === null ? (
              <p className="mt-4 text-fg-2">{t.summary.noScore}</p>
            ) : (
              <>
                <p className="mt-3 flex items-baseline gap-2">
                  <span className="text-[clamp(4.5rem,10vw,7rem)] font-semibold leading-none tracking-[-0.06em] text-fg">{score.total}</span>
                  <span className="text-[1.25rem] text-fg-3">/ 100</span>
                </p>
                <div className="mt-6">
                  <div className="relative flex h-2 overflow-hidden rounded-full">
                    {ASSESSMENT_BANDS.map(([band, from], i) => {
                      const to = ASSESSMENT_BANDS[i + 1]?.[1] ?? 100;
                      return (
                        <span
                          key={band}
                          className={`h-full ${band === assessment ? "bg-[var(--audit-gold)]" : "bg-line-strong"} ${i ? "ml-0.5" : ""}`}
                          style={{ width: `${to - from}%` }}
                        />
                      );
                    })}
                  </div>
                  <div className="relative mt-1 h-3">
                    <span className="absolute top-0 -translate-x-1/2 text-[0.6875rem] text-fg" style={{ left: `${score.total}%` }}>
                      ▲
                    </span>
                  </div>
                  <ul className="mt-1 grid grid-cols-[40fr_20fr_20fr_20fr] text-[0.6875rem]">
                    {ASSESSMENT_BANDS.map(([band]) => (
                      <li key={band} className={`min-w-0 truncate ${band === assessment ? "font-semibold text-fg" : "text-fg-3 max-sm:invisible"}`}>
                        {t.assessment[band].label}
                      </li>
                    ))}
                  </ul>
                </div>
                {assessment && (
                  <p className="mt-6 border-t border-line pt-5">
                    <span className="label block text-fg-3">{t.summary.level}</span>
                    <span className="mt-1 block text-[1.4rem] font-semibold tracking-[-0.02em] text-fg">{t.assessment[assessment].label}</span>
                    <span className="mt-1 block text-[0.9375rem] text-fg-2">{t.assessment[assessment].desc}</span>
                  </p>
                )}
                <p className="mt-5 text-[0.75rem] leading-relaxed text-fg-3">{t.summary.basis(score.assessed.length, score.assessable)}</p>
              </>
            )}
          </div>

          <div className="grid gap-4 doc:col-span-7">
            {strongest && (
              <div className="audit-avoid rounded-[1.25rem] border border-line p-6">
                <p className="label text-fg-3">{t.summary.strongest}</p>
                <p className="mt-2 text-[1.35rem] font-semibold tracking-[-0.02em] text-fg">{t.categories[strongest]}</p>
                <p className="mt-1 text-[0.9375rem] text-fg-2">{audit.scores.find((s) => s.id === strongest)?.rationale}</p>
              </div>
            )}
            {topOpportunity && (
              <div className="audit-avoid rounded-[1.25rem] border border-line p-6">
                <p className="label text-fg-3">{t.summary.priority}</p>
                <p className="mt-2 text-[1.35rem] font-semibold tracking-[-0.02em] text-fg">{topOpportunity.title}</p>
                <p className="mt-1 text-[0.9375rem] text-fg-2">{topOpportunity.summary}</p>
              </div>
            )}
            <div className="audit-avoid rounded-[1.25rem] border-2 border-[var(--audit-gold)] p-6">
              <p className="label text-accent">{t.summary.recommendation}</p>
              <p className="mt-2 font-serif text-[1.5rem] leading-snug text-fg">{audit.summary.primaryRecommendation}</p>
            </div>
          </div>
        </div>

        <div className="audit-avoid mt-10 rounded-[1.25rem] border border-line p-6">
          <p className="label text-fg-3">{t.legendTitle}</p>
          <ul className="mt-4 grid gap-4 sm:grid-cols-3">
            {(["observed", "provided", "hypothesis"] as const).map((k) => (
              <li key={k} className="flex flex-col items-start gap-2">
                <Provenance kind={k} t={t} />
                <span className="text-[0.875rem] text-fg-2">{t.provenance[k].desc}</span>
              </li>
            ))}
          </ul>
        </div>
      </AuditSection>

      {/* 02 · Évaluation */}
      <AuditSection id="scorecard" t={t} title={t.scorecard.title} lead={t.scorecard.lead}>
        <ul className="border-t border-line">
          {CATEGORY_ORDER.map((id) => {
            const s = audit.scores.find((c) => c.id === id);
            const max = CATEGORY_MAX[id];
            const pts = s?.points ?? null;
            return (
              <li key={id} className="audit-avoid grid gap-3 border-b border-line py-6 doc:grid-cols-12 doc:gap-10">
                <div className="doc:col-span-4">
                  <p className="text-[1.15rem] font-semibold tracking-[-0.02em] text-fg">{t.categories[id]}</p>
                  <p className="mt-1 font-mono text-[0.8125rem] text-fg-3">
                    {pts === null ? t.scorecard.notEnoughNote : `${pts} / ${max} ${t.scorecard.points}`}
                  </p>
                </div>
                <div className="doc:col-span-8">
                  {pts === null ? (
                    <div aria-hidden className="flex h-2.5 items-center rounded-full border border-dashed border-line-strong" />
                  ) : (
                    <div className="flex h-2.5 gap-0.5" role="img" aria-label={`${pts} / ${max}`}>
                      {Array.from({ length: max }, (_, i) => (
                        <span key={i} className={`h-full flex-1 first:rounded-l-full last:rounded-r-full ${i < pts ? "bg-[var(--audit-gold)]" : "bg-line"}`} />
                      ))}
                    </div>
                  )}
                  {pts === null && <p className="mt-2 text-[0.8125rem] font-medium text-fg">{t.scorecard.notEnough}</p>}
                  <p className="mt-3 text-[0.9375rem] leading-relaxed text-fg-2">{s?.rationale}</p>
                  <div className="mt-2">
                    <Refs ids={s?.basis ?? []} label={t.scorecard.basis} />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </AuditSection>

      {/* 03 · Parcours */}
      <AuditSection id="journey" t={t} title={t.journey.title} lead={t.journey.lead}>
        <ul className="mb-8 flex flex-wrap gap-x-6 gap-y-2 text-[0.8125rem] text-fg-2">
          {(Object.keys(t.journey.status) as JourneyStatus[]).map((st) => (
            <li key={st} className="flex items-center gap-2">
              <span aria-hidden className={`size-3 rounded-full border-2 ${STATUS_STYLE[st]}`} />
              {t.journey.status[st]}
            </li>
          ))}
        </ul>
        <ol className="audit-avoid relative grid gap-0 doc:grid-cols-9">
          <span aria-hidden className="absolute left-[0.4375rem] top-2 bottom-2 w-px bg-line-strong doc:left-0 doc:right-0 doc:top-[0.4375rem] doc:bottom-auto doc:h-px doc:w-auto" />
          {audit.journey.map((step) => (
            <li key={step.id} className="relative flex gap-4 pb-6 doc:block doc:pb-0 doc:pr-3">
              <span aria-hidden className={`relative z-10 mt-0.5 block size-[0.9375rem] shrink-0 rounded-full border-2 doc:mt-0 ${STATUS_STYLE[step.status]}`} />
              <div className="doc:mt-5">
                <p className="text-[1rem] font-semibold tracking-[-0.02em] text-fg">{t.journey.stages[step.id]}</p>
                <p className={`mt-1 font-mono text-[0.6875rem] uppercase tracking-[0.1em] ${step.status === "opportunity" ? "text-[var(--audit-risk)]" : step.status === "verified" ? "text-accent" : "text-fg-3"}`}>
                  {t.journey.status[step.status]}
                </p>
                <p className="mt-2 text-[0.8125rem] leading-snug text-fg-2">{step.note}</p>
              </div>
            </li>
          ))}
        </ol>
      </AuditSection>

      {/* 04 · Observations */}
      <AuditSection id="observations" t={t} title={t.observations.title} lead={t.observations.lead}>
        <div className="grid gap-4 docmd:grid-cols-2">
          {audit.observations.map((o) => (
            <article key={o.id} id={`obs-${o.id}`} className="audit-avoid scroll-mt-40 rounded-[1.25rem] border border-line bg-surface p-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[0.75rem] text-fg-3">{o.id}</span>
                <Provenance kind={o.provenance} t={t} />
                <span className="text-[0.75rem] text-fg-3">{t.categories[o.category]}</span>
              </div>
              <h3 className="mt-4 text-[1.25rem] font-semibold tracking-[-0.02em] text-fg">{o.title}</h3>
              <p className="mt-2 leading-relaxed text-fg">{o.statement}</p>
              <dl className="mt-5 space-y-3 border-t border-line pt-4 text-[0.875rem]">
                <div className="grid gap-1 sm:grid-cols-[9rem_1fr] sm:gap-4">
                  <dt className="text-fg-3">{t.observations.evidence}</dt>
                  <dd className="text-fg-2">
                    {o.sources.map((sid) => {
                      const s = sourceById.get(sid);
                      return (
                        <span key={sid} className="block">
                          <span className="font-mono text-fg-3">{sid}</span> {s?.label}
                          {s?.url && (
                            <>
                              {" — "}
                              <span className="break-all font-mono text-[0.75rem]">{s.url.replace(/^https?:\/\//, "")}</span>
                            </>
                          )}
                        </span>
                      );
                    })}
                  </dd>
                </div>
                <div className="grid gap-1 sm:grid-cols-[9rem_1fr] sm:gap-4">
                  <dt className="text-fg-3">{t.confidenceLabel}</dt>
                  <dd className="text-fg-2">{t.confidence[o.confidence]}</dd>
                </div>
                <div className="grid gap-1 sm:grid-cols-[9rem_1fr] sm:gap-4">
                  <dt className="text-fg-3">{t.observations.implication}</dt>
                  <dd className="text-fg-2">{o.implication}</dd>
                </div>
                <div className="grid gap-1 sm:grid-cols-[9rem_1fr] sm:gap-4">
                  <dt className="text-accent">{t.observations.recommendation}</dt>
                  <dd className="font-medium text-fg">{o.recommendation}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>

        <div className="mt-14 grid gap-10 doc:grid-cols-12">
          <div className="doc:col-span-5">
            <h3 className="text-[1.35rem] font-semibold tracking-[-0.02em] text-fg">{t.observations.providedTitle}</h3>
            <dl className="audit-avoid mt-5 border-t border-line">
              {audit.providedMetrics.map((m) => (
                <div key={m.id} id={`met-${m.id}`} className="grid scroll-mt-40 grid-cols-[minmax(0,1fr)_minmax(0,55%)] gap-x-4 gap-y-1 border-b border-line py-3.5">
                  <dt className="text-[0.875rem] text-fg-2">
                    <span className="mr-2 font-mono text-[0.75rem] text-fg-3">{m.id}</span>
                    {m.label}
                  </dt>
                  <dd className="text-right text-[0.9375rem] font-semibold text-fg">{m.value}</dd>
                  <dd className="col-span-2 text-[0.75rem] text-fg-3">
                    <Provenance kind="provided" t={t} /> <span className="ml-1 font-mono">{m.source}</span>
                    {m.note ? ` · ${m.note}` : ""}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="doc:col-span-7">
            <h3 className="text-[1.35rem] font-semibold tracking-[-0.02em] text-fg">{t.observations.hypothesesTitle}</h3>
            <p className="mt-2 text-[0.9375rem] text-fg-2">{t.observations.hypothesesLead}</p>
            <ul className="mt-5 grid gap-3">
              {audit.hypotheses.map((h) => (
                <li key={h.id} id={`hyp-${h.id}`} className="audit-avoid scroll-mt-40 rounded-[1.25rem] border border-dashed border-line-strong p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[0.75rem] text-fg-3">{h.id}</span>
                    <Provenance kind="hypothesis" t={t} />
                    <span className="text-[0.75rem] text-fg-3">{t.categories[h.category]}</span>
                  </div>
                  <p className="mt-3 font-semibold text-fg">{h.title}</p>
                  <p className="mt-1 text-[0.9375rem] text-fg-2">{h.statement}</p>
                  <p className="mt-3 text-[0.875rem] text-fg-2">
                    <span className="text-fg-3">{t.observations.validation} · </span>
                    {h.validation}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </AuditSection>

      {/* 05 · Opportunités */}
      <AuditSection id="opportunities" t={t} title={t.opportunities.title} lead={t.opportunities.lead}>
        <div className="grid gap-4 doc:grid-cols-3">
          {(["high", "medium", "lower"] as const).map((tier) => (
            <div key={tier} className={`rounded-[1.25rem] p-4 sm:p-5 ${tier === "high" ? "bg-[rgb(10_10_10/0.05)] ring-1 ring-fg/30" : "ring-1 ring-line"}`}>
              <p className="label flex items-center justify-between text-fg">
                {t.opportunities.tiers[tier]}
                <span className="font-mono text-fg-3">{ranked[tier].length}</span>
              </p>
              <ul className="mt-4 space-y-3">
                {ranked[tier].length === 0 && <li className="text-fg-3">{t.opportunities.empty}</li>}
                {ranked[tier].map((o) => (
                  <li key={o.id} className="audit-avoid rounded-xl border border-line bg-canvas p-4">
                    <p className="flex items-start justify-between gap-3">
                      <span className="font-semibold leading-snug text-fg">{o.title}</span>
                      <span className="font-mono text-[0.75rem] text-fg-3" title={opportunityTier(o)}>
                        {opportunityValue(o)}
                      </span>
                    </p>
                    <p className="mt-1.5 text-[0.875rem] text-fg-2">{o.summary}</p>
                    <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1">
                      <Dots value={o.impact} label={t.opportunities.factors.impact} />
                      <Dots value={o.confidence} label={t.opportunities.factors.confidence} />
                      <Dots value={o.relevance} label={t.opportunities.factors.relevance} />
                      <Dots value={o.complexity} label={t.opportunities.factors.complexity} />
                    </div>
                    <div className="mt-3">
                      <Refs ids={o.basis} label={t.architecture.basis} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </AuditSection>

      {/* 06 · Modèle économique */}
      <AuditSection id="roi" t={t} title={t.roi.title} lead={t.roi.lead}>
        <RoiModeller copy={t.roi} locale={audit.locale} assumptions={audit.roi.assumptions} scenarios={audit.roi.scenarios} />
      </AuditSection>

      {/* 07 · Architecture */}
      <AuditSection id="architecture" t={t} title={t.architecture.title} lead={t.architecture.lead}>
        <div className="audit-avoid">
          <div className="mx-auto flex w-fit items-center gap-2.5 rounded-full bg-fg px-5 py-2.5 text-canvas">
            <AmynMark className="size-5" />
            <span className="font-semibold">Revenue OS</span>
          </div>
          <div aria-hidden className="mx-auto hidden h-8 w-[66.6%] border-x border-t border-line-strong doc:block" style={{ marginTop: "1rem" }} />
          <div className="mt-4 grid gap-4 doc:mt-0 doc:grid-cols-3">
            {MODULE_GROUPS.map((g) => (
              <div key={g.id} className="rounded-[1.25rem] border border-line p-4">
                <p className="label text-accent">{t.architecture.groups[g.id]}</p>
                <ul className="mt-3 space-y-2">
                  {g.modules.map((m) => {
                    const rec = recommended.get(m);
                    return (
                      <li
                        key={m}
                        className={`flex items-center justify-between gap-3 rounded-xl px-3.5 py-3 ${rec ? "border border-fg/25 bg-surface" : "border border-dashed border-line text-fg-3"}`}
                      >
                        <span className={rec ? "font-medium text-fg" : "text-[0.875rem]"}>{t.modules[m]}</span>
                        {rec ? <PriorityBadge p={rec.priority} t={t} /> : <span className="text-right text-[0.6875rem]">{t.architecture.notRecommended}</span>}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <h3 className="mt-16 text-[1.35rem] font-semibold tracking-[-0.02em] text-fg">{t.architecture.recommendationsTitle}</h3>
        <ul className="mt-5 border-t border-line">
          {audit.recommendations.map((r) => (
            <li key={r.module} className="audit-avoid grid gap-4 border-b border-line py-6 doc:grid-cols-12 doc:gap-8">
              <div className="doc:col-span-3">
                <p className="text-[1.15rem] font-semibold tracking-[-0.02em] text-fg">{t.modules[r.module]}</p>
                <div className="mt-2">
                  <PriorityBadge p={r.priority} t={t} />
                </div>
              </div>
              <dl className="grid gap-4 text-[0.9375rem] sm:grid-cols-3 doc:col-span-9">
                <div>
                  <dt className="label text-fg-3">{t.architecture.what}</dt>
                  <dd className="mt-1.5 text-fg">{r.what}</dd>
                </div>
                <div>
                  <dt className="label text-fg-3">{t.architecture.why}</dt>
                  <dd className="mt-1.5 text-fg-2">{r.why}</dd>
                  <dd className="mt-2">
                    <Refs ids={r.basis} label={t.architecture.basis} />
                  </dd>
                </div>
                <div>
                  <dt className="label text-fg-3">{t.architecture.impact}</dt>
                  <dd className="mt-1.5 text-fg-2">{r.impact}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      </AuditSection>

      {/* 08 · Feuille de route */}
      <AuditSection id="roadmap" t={t} title={roadmap.weeks <= 13 ? t.roadmap.title90 : t.roadmap.titleWeeks(roadmap.weeks)} lead={t.roadmap.lead}>
        <div className="audit-avoid">
          <div className="relative grid gap-1" style={{ gridTemplateColumns: `repeat(${roadmap.weeks}, minmax(0, 1fr))` }}>
            {Array.from({ length: roadmap.weeks }, (_, i) => (
              <span key={i} className="text-center font-mono text-[0.6875rem] text-fg-3">
                {i + 1}
              </span>
            ))}
            {roadmap.phases.map((p, i) => (
              <span
                key={p.id}
                className={`h-3 rounded-full ${i === 1 ? "bg-[var(--audit-gold)]" : i === 3 ? "bg-fg/40" : "bg-fg"}`}
                style={{ gridColumn: `${p.from} / ${p.to + 1}`, gridRow: i + 2 }}
              />
            ))}
          </div>
          <ol className="mt-10 grid gap-4 sm:grid-cols-2 doc:grid-cols-4">
            {roadmap.phases.map((p, i) => {
              const base = t.roadmap.phases[p.id];
              const items = [...base.items, ...p.modules.map((m) => t.modules[m])];
              return (
                <li key={p.id} className="rounded-[1.25rem] border border-line p-5">
                  <p className="font-mono text-[0.75rem] text-accent">
                    {String(i + 1).padStart(2, "0")} · {t.roadmap.weeks(p.from, p.to)}
                  </p>
                  <p className="mt-2 text-[1.15rem] font-semibold tracking-[-0.02em] text-fg">{base.name}</p>
                  <ul className="mt-3 space-y-1.5">
                    {items.map((x) => (
                      <li key={x} className="flex gap-2 text-[0.875rem] text-fg-2">
                        <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-fg-3" />
                        {x}
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ol>
          {roadmap.later.length > 0 && (
            <p className="mt-6 text-[0.9375rem] text-fg-2">
              <span className="label mr-2 text-fg-3">{t.roadmap.later}</span>
              {roadmap.later.map((m) => t.modules[m]).join(" · ")}
            </p>
          )}
        </div>
      </AuditSection>

      {/* 09 · Investissement */}
      <AuditSection id="investment" t={t} title={t.investment.title} tone="ink">
        <div className="audit-avoid grid gap-8 rounded-[1.5rem] border border-[rgb(242_238_230/0.12)] p-6 sm:p-10 doc:grid-cols-12 doc:gap-12">
          <div className="doc:col-span-5">
            <p className="whitespace-nowrap text-[clamp(1.6rem,3vw,2.6rem)] font-semibold tracking-[-0.04em] text-fg">{t.investment.product}</p>
            <p className="mt-1 font-serif text-[1.35rem] text-fg-2">{t.investment.kind}</p>
            <p className="label mt-8 text-fg-3">{t.investment.from}</p>
            <p className="mt-1 text-[clamp(2.6rem,6vw,4rem)] font-semibold leading-none tracking-[-0.04em] text-fg">{t.investment.price}</p>
            <p className="mt-3 text-[0.8125rem] text-fg-3">{t.investment.tax}</p>
          </div>
          <p className="self-end text-[1.05rem] leading-relaxed text-fg-2 doc:col-span-7">{t.investment.body}</p>
        </div>
      </AuditSection>

      {/* 10 · Prochaine étape */}
      <AuditSection id="nextStep" t={t} title={t.nextStep.title} tone="ink">
        <div className="audit-avoid grid gap-10 doc:grid-cols-12">
          <div className="doc:col-span-6">
            <p className="text-[1.3rem] font-semibold text-fg">{t.nextStep.duration}</p>
            <ul className="mt-5 space-y-3">
              {t.nextStep.items.map((x) => (
                <li key={x} className="flex gap-3 text-fg-2">
                  <span aria-hidden className="mt-2.5 size-1.5 shrink-0 rounded-full bg-gold" />
                  {x}
                </li>
              ))}
            </ul>
          </div>
          <div className="doc:col-span-6">
            <p className="font-serif text-[clamp(1.6rem,3vw,2.2rem)] leading-snug text-fg">{t.nextStep.promise}</p>
            <a
              href={booking}
              data-track="architecture_session_clicked"
              data-track-place="audit"
              data-print-hide=""
              className="mt-8 inline-flex min-h-14 items-center justify-center rounded-full bg-bone px-7 text-center text-[1rem] font-medium text-ink transition-colors hover:bg-gold-2"
            >
              {t.nextStep.cta}
            </a>
            <p className="audit-print-only mt-6 text-fg-2">
              {site.email}
            </p>
          </div>
        </div>
      </AuditSection>

      {/* 11 · Sources */}
      <AuditSection id="sources" t={t} title={t.sourcesSection.title} lead={t.sourcesSection.method}>
        <ul className="audit-avoid border-t border-line">
          {audit.sources.map((s) => (
            <li key={s.id} className="grid gap-1 border-b border-line py-3.5 text-[0.9375rem] sm:grid-cols-[4rem_10rem_1fr_7rem] sm:gap-4">
              <span className="font-mono text-fg-3">{s.id}</span>
              <span className="text-fg-3">{t.sourcesSection.kinds[s.kind]}</span>
              <span className="text-fg">
                {s.label}
                {s.url && <span className="block break-all font-mono text-[0.75rem] text-fg-3">{s.url}</span>}
              </span>
              <span className="font-mono text-[0.8125rem] text-fg-3 sm:text-right">{s.date ?? ""}</span>
            </li>
          ))}
        </ul>
        {audit.fictional && <p className="mt-8 max-w-3xl text-[0.875rem] leading-relaxed text-fg-3">{t.sampleNote}</p>}
      </AuditSection>
    </article>
  );
}

"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { buttonClass } from "@/components/ui/Button";
import { ArrowRight, Check } from "@/components/ui/Icons";
import { track } from "@/lib/analytics";
import {
  AUDIT_LIMITS,
  AUDIT_ORDER,
  AUDIT_STEPS,
  CHANNELS,
  CRM_SETUPS,
  CUSTOMER_VALUES,
  EMPTY_REVENUE_AUDIT,
  INDUSTRIES,
  MONTHLY_LEADS,
  PROBLEMS,
  REVENUE_RANGES,
  TEAM_SIZES,
  auditLabel,
  sanitizeRevenueAudit,
  validateAuditStep,
  validateRevenueAudit,
  type AuditChoiceGroup,
  type RevenueAuditField,
  type RevenueAuditValues,
} from "@/lib/forms/revenue-audit";
import { LIMITS, hasErrors } from "@/lib/forms/shared";
import type { Locale } from "@/lib/i18n/config";
import { href } from "@/lib/i18n/routes";
import { getUi } from "@/lib/i18n/ui";
import { retention, retentionEn } from "@/lib/legal";
import { ChoiceGroup, Honeypot, PrivacyCheck, TextArea, TextField } from "./Fields";
import { useFormSubmission } from "./useFormSubmission";

const FORM = "audit";

/**
 * Demande de Revenue Audit, en cinq étapes. Chaque étape se valide avant
 * la suivante ; on revient en arrière sans rien perdre ; l'envoi n'a lieu
 * qu'à la dernière.
 *
 * Paramètres de lien acceptés (aucune donnée personnelle) :
 *   ?source=outreach  → la demande est marquée comme faisant suite à un
 *                        message d'AMYN ;
 *   ?business=…        → pré-remplit l'entreprise, modifiable.
 */
export function RevenueAuditForm({ locale }: { locale: Locale }) {
  return (
    <Suspense fallback={<Form locale={locale} initial={{ ...EMPTY_REVENUE_AUDIT, lang: locale }} />}>
      <FormWithParams locale={locale} />
    </Suspense>
  );
}

function FormWithParams({ locale }: { locale: Locale }) {
  const params = useSearchParams();
  const initial = sanitizeRevenueAudit({
    ...EMPTY_REVENUE_AUDIT,
    company: params.get("business") ?? "",
    source: params.get("source") ?? "site",
    lang: locale,
  });
  return <Form locale={locale} initial={initial} />;
}

function Form({ locale, initial }: { locale: Locale; initial: RevenueAuditValues }) {
  const ui = getUi(locale);
  const t = ui.revenueAuditForm;
  const f = ui.form;
  const { values, set, errors, status, serverError, submit, honeypot } = useFormSubmission<
    RevenueAuditValues,
    RevenueAuditField
  >({
    formId: FORM,
    endpoint: "/api/revenue-audit",
    initial,
    sanitize: sanitizeRevenueAudit,
    validate: validateRevenueAudit,
    order: AUDIT_ORDER,
    messages: { failed: f.failed, offline: f.offline },
  });

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<"next" | "back">("next");
  const [stepErrors, setStepErrors] = useState<Partial<Record<RevenueAuditField, string>>>({});
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const started = useRef(false);
  const top = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === "sent") track("revenue_audit_submitted", { locale, source: values.source });
  }, [status, locale, values.source]);

  const clean = () => sanitizeRevenueAudit(values as unknown as Record<string, unknown>);

  const update = <K extends keyof RevenueAuditValues>(field: K, value: RevenueAuditValues[K]) => {
    if (!started.current) {
      started.current = true;
      track("revenue_audit_started", { locale });
    }
    set(field, value);
    if (checked.has(step)) {
      const next = sanitizeRevenueAudit({ ...values, [field]: value } as unknown as Record<string, unknown>);
      setStepErrors(validateAuditStep(next, step));
    }
  };

  const shown = { ...errors, ...stepErrors };
  const e = (field: RevenueAuditField) => shown[field];
  const id = (field: RevenueAuditField) => `${FORM}-${field}`;
  const label = (group: AuditChoiceGroup) => (option: string) => auditLabel(group, option, locale);

  function go(to: number) {
    setDirection(to > step ? "next" : "back");
    setStep(to);
    setStepErrors({});
    requestAnimationFrame(() => {
      top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      top.current?.parentElement
        ?.querySelector<HTMLElement>("[data-step-body] input:not([type=hidden]), [data-step-body] textarea")
        ?.focus({ preventScroll: true });
    });
  }

  function next() {
    const found = validateAuditStep(clean(), step);
    setChecked((c) => new Set(c).add(step));
    setStepErrors(found);
    if (hasErrors(found)) {
      const first = AUDIT_STEPS[step].fields.find((field) => found[field]);
      if (first)
        (document.getElementById(id(first)) ??
          document.querySelector<HTMLElement>(`#${id(first)}-group input`))?.focus();
      return;
    }
    track("revenue_audit_step_completed", { locale, step: step + 1, name: AUDIT_STEPS[step].id });
    go(step + 1);
  }

  if (status === "sent") return <Confirmation locale={locale} values={values} />;

  const sending = status === "sending";
  const last = step === AUDIT_STEPS.length - 1;
  const total = AUDIT_STEPS.length;

  return (
    <form
      onSubmit={(event) => {
        if (!last) {
          event.preventDefault();
          next();
          return;
        }
        submit(event);
      }}
      noValidate
      className="relative"
    >
      <Honeypot inputRef={honeypot} locale={locale} />

      {/* Progression */}
      <div ref={top} className="scroll-mt-[calc(var(--header-h)+1.5rem)]">
        <div className="flex items-baseline justify-between gap-4">
          <p className="label text-gold">
            {f.step} {step + 1} / {total}
          </p>
          <p className="text-[0.8125rem] text-fg-3">{t.intro}</p>
        </div>
        <ol className="mt-4 grid grid-cols-5 gap-1.5" aria-label={f.steps}>
          {AUDIT_STEPS.map((s, i) => (
            <li key={s.id}>
              <button
                type="button"
                disabled={i > step || sending}
                onClick={() => i < step && go(i)}
                aria-current={i === step ? "step" : undefined}
                aria-label={`${f.step} ${i + 1} — ${t.stepTitles[i]}`}
                className="group block w-full py-2 text-left disabled:cursor-default"
              >
                <span className="block h-1 overflow-hidden rounded-full bg-[rgb(242_238_230/0.1)]">
                  <span
                    className="block h-full origin-left rounded-full bg-gradient-to-r from-gold to-gold-2 transition-transform duration-700 ease-[var(--ease-out)]"
                    style={{ transform: `scaleX(${i < step ? 1 : i === step ? 0.5 : 0})` }}
                  />
                </span>
                <span
                  className={`mt-2.5 hidden text-[0.75rem] leading-tight transition-colors sm:block ${
                    i === step ? "text-fg" : i < step ? "text-fg-2 group-hover:text-fg" : "text-fg-3"
                  }`}
                >
                  {t.stepTitles[i]}
                </span>
              </button>
            </li>
          ))}
        </ol>

        <h3 className="display-sm mt-8" aria-live="polite">
          {t.stepTitles[step]}
        </h3>
        <p className="mt-2 text-fg-2">{t.stepLeads[step]}</p>
      </div>

      <div
        key={step}
        data-step-body=""
        className={`mt-8 grid gap-x-5 gap-y-7 sm:grid-cols-2 ${direction === "next" ? "step-in-next" : "step-in-back"}`}
      >
        {step === 0 && (
          <>
            <TextField locale={locale} id={id("company")} label={t.company} value={values.company} onChange={(v) => update("company", v)} error={e("company")} autoComplete="organization" maxLength={LIMITS.company} disabled={sending} />
            <TextField locale={locale} id={id("website")} label={t.website} inputMode="url" placeholder={t.websitePlaceholder} value={values.website} onChange={(v) => update("website", v)} error={e("website")} autoComplete="url" maxLength={LIMITS.url} disabled={sending} />
            <ChoiceGroup locale={locale} id={id("industry")} legend={t.industry} options={INDUSTRIES} labelFor={label("industry")} value={values.industry} onChange={(v) => update("industry", v as RevenueAuditValues["industry"])} error={e("industry")} disabled={sending} className="sm:col-span-2" />
          </>
        )}

        {step === 1 && (
          <>
            <ChoiceGroup locale={locale} id={id("revenue")} legend={t.revenue} options={REVENUE_RANGES} labelFor={label("revenue")} value={values.revenue} onChange={(v) => update("revenue", v as RevenueAuditValues["revenue"])} error={e("revenue")} disabled={sending} className="sm:col-span-2" />
            <ChoiceGroup locale={locale} id={id("team")} legend={t.team} options={TEAM_SIZES} labelFor={label("team")} value={values.team} onChange={(v) => update("team", v as RevenueAuditValues["team"])} error={e("team")} disabled={sending} className="sm:col-span-2" />
            <ChoiceGroup locale={locale} id={id("leads")} legend={t.leads} options={MONTHLY_LEADS} labelFor={label("leads")} value={values.leads} onChange={(v) => update("leads", v as RevenueAuditValues["leads"])} error={e("leads")} disabled={sending} className="sm:col-span-2" />
          </>
        )}

        {step === 2 && (
          <>
            <ChoiceGroup locale={locale} id={id("value")} legend={t.value} options={CUSTOMER_VALUES} labelFor={label("value")} value={values.value} onChange={(v) => update("value", v as RevenueAuditValues["value"])} error={e("value")} disabled={sending} className="sm:col-span-2" />
            <ChoiceGroup locale={locale} id={id("crm")} legend={t.crm} options={CRM_SETUPS} labelFor={label("crm")} value={values.crm} onChange={(v) => update("crm", v as RevenueAuditValues["crm"])} error={e("crm")} disabled={sending} className="sm:col-span-2" />
            {(values.crm === "market" || values.crm === "custom") && (
              <TextField locale={locale} id={id("crmName")} label={t.crmName} optional placeholder={t.crmNamePlaceholder} value={values.crmName} onChange={(v) => update("crmName", v)} error={e("crmName")} maxLength={AUDIT_LIMITS.crmName} disabled={sending} className="sm:col-span-2" />
            )}
            <ChoiceGroup locale={locale} id={id("channels")} legend={t.channels} options={CHANNELS} labelFor={label("channels")} multiple value={values.channels} onChange={(v) => update("channels", v as RevenueAuditValues["channels"])} error={e("channels")} disabled={sending} className="sm:col-span-2" />
          </>
        )}

        {step === 3 && (
          <>
            <ChoiceGroup locale={locale} id={id("problems")} legend={t.problems} options={PROBLEMS} labelFor={label("problems")} multiple value={values.problems} onChange={(v) => update("problems", v as RevenueAuditValues["problems"])} error={e("problems")} disabled={sending} className="sm:col-span-2" />
            <TextArea locale={locale} id={id("problemDetails")} label={t.problemDetails} optional rows={4} placeholder={t.problemDetailsPlaceholder} value={values.problemDetails} onChange={(v) => update("problemDetails", v)} error={e("problemDetails")} maxLength={AUDIT_LIMITS.problemDetails} disabled={sending} className="sm:col-span-2" />
          </>
        )}

        {step === 4 && (
          <>
            <TextField locale={locale} id={id("name")} label={t.name} value={values.name} onChange={(v) => update("name", v)} error={e("name")} autoComplete="name" maxLength={LIMITS.name} disabled={sending} />
            <TextField locale={locale} id={id("role")} label={t.role} optional placeholder={t.rolePlaceholder} value={values.role} onChange={(v) => update("role", v)} error={e("role")} autoComplete="organization-title" maxLength={AUDIT_LIMITS.role} disabled={sending} />
            <TextField locale={locale} id={id("email")} label={t.email} type="email" inputMode="email" value={values.email} onChange={(v) => update("email", v)} error={e("email")} autoComplete="email" maxLength={LIMITS.email} disabled={sending} />
            <TextField locale={locale} id={id("phone")} label={t.phone} type="tel" inputMode="tel" optional value={values.phone} onChange={(v) => update("phone", v)} error={e("phone")} autoComplete="tel" maxLength={LIMITS.phone} disabled={sending} />
            <div className="sm:col-span-2">
              <PrivacyCheck locale={locale} id={id("privacy")} checked={values.privacy} onChange={(v) => update("privacy", v)} error={e("privacy")} disabled={sending} />
            </div>
          </>
        )}
      </div>

      <div aria-live="polite">
        {serverError && (
          <p className="mt-8 rounded-[var(--radius-sm)] border border-error/50 px-4 py-3 text-[0.9375rem] text-error">
            {serverError}
          </p>
        )}
      </div>

      <div className="mt-10 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        {step > 0 ? (
          <button type="button" onClick={() => go(step - 1)} disabled={sending} data-magnetic="" className={buttonClass("secondary", "w-full sm:w-auto")}>
            {f.back}
          </button>
        ) : (
          <span />
        )}
        <button
          type="submit"
          disabled={sending}
          data-magnetic=""
          className={buttonClass("primary", "w-full !min-h-14 sm:w-auto disabled:cursor-wait disabled:opacity-80")}
        >
          {sending ? t.sending : last ? t.submit : f.continue}
          {sending ? (
            <span aria-hidden className="size-4 animate-spin rounded-full border-[1.5px] border-current border-t-transparent motion-reduce:animate-none" />
          ) : (
            <ArrowRight className="nudge size-4" />
          )}
        </button>
      </div>

      {last && (
        <p className="mt-6 text-[0.8125rem] leading-relaxed text-fg-3">
          {f.privacyNoteBefore} {locale === "en" ? retentionEn.requests : retention.requests}. {f.privacyNoteRights}{" "}
          <Link href={href("privacy", locale)} className="underline underline-offset-4">
            {f.privacyNoteLink}
          </Link>
          .
        </p>
      )}
    </form>
  );
}

/**
 * Confirmation : annoncée et mise au focus ; reprend ce que le visiteur a
 * transmis (rien d'autre) et dit honnêtement la suite.
 */
function Confirmation({ locale, values }: { locale: Locale; values: RevenueAuditValues }) {
  const t = getUi(locale).revenueAuditForm;
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);

  const recap: [string, string][] = [
    [t.company, values.company],
    [t.industry, auditLabel("industry", values.industry, locale)],
    [t.leads, auditLabel("leads", values.leads, locale)],
    [t.problems, values.problems.map((p) => auditLabel("problems", p, locale)).join(" · ")],
  ];

  return (
    <div role="status" className="rise">
      <p className="label inline-flex items-center gap-2.5 text-gold">
        <span aria-hidden className="flex size-6 items-center justify-center rounded-full bg-gold text-ink">
          <Check className="size-3.5" />
        </span>
        {t.sentLabel}
      </p>
      <h3 ref={heading} tabIndex={-1} className="display-md mt-8 outline-none">
        {t.sentTitle}
      </h3>
      <div className="mt-6 max-w-xl space-y-4 text-fg-2">
        {t.sentBody.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </div>
      <dl className="mt-10 grid gap-x-8 gap-y-5 rounded-[var(--radius-md)] border border-line p-5 sm:grid-cols-2 sm:p-6">
        {recap.map(([k, v]) => (
          <div key={k} className={k === t.problems ? "sm:col-span-2" : undefined}>
            <dt className="label text-[0.6875rem] text-fg-3">{k}</dt>
            <dd className="mt-1.5 text-fg">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="label mt-10 text-fg-3">{t.sentNext}</p>
      <Link href={href("revenueOs", locale)} className="link-line mt-3 inline-flex min-h-11 items-center gap-2 text-fg">
        {t.sentLink}
        <ArrowRight className="size-4" />
      </Link>
    </div>
  );
}

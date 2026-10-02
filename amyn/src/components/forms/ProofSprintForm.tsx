"use client";

import Link from "next/link";
import { buttonClass } from "@/components/ui/Button";
import { ArrowRight } from "@/components/ui/Icons";
import {
  EMPTY_PROOFSPRINT,
  PROOFSPRINT_LIMITS,
  PROOFSPRINT_ORDER,
  sanitizeProofSprint,
  validateProofSprint,
  type ProofSprintField,
  type ProofSprintValues,
} from "@/lib/forms/proofsprint";
import { LIMITS } from "@/lib/forms/shared";
import type { Locale } from "@/lib/i18n/config";
import { href } from "@/lib/i18n/routes";
import { getUi } from "@/lib/i18n/ui";
import { retention, retentionEn } from "@/lib/legal";
import { Honeypot, PrivacyCheck, SentState, TextArea, TextField } from "./Fields";
import { useFormSubmission } from "./useFormSubmission";

const FORM = "proofsprint";

/**
 * Demande ProofSprint : un seul écran, quatre informations utiles. Le
 * message de succès n'apparaît que si le serveur confirme l'envoi à
 * contact@amyn.agency ; sinon l'erreur reste affichée et rien n'est perdu
 * dans le formulaire.
 */
export function ProofSprintForm({ locale }: { locale: Locale }) {
  const ui = getUi(locale);
  const t = ui.proofsprintForm;
  const { values, set, errors, status, serverError, submit, honeypot } = useFormSubmission<
    ProofSprintValues,
    ProofSprintField
  >({
    formId: FORM,
    endpoint: "/api/proofsprint",
    initial: { ...EMPTY_PROOFSPRINT, lang: locale },
    sanitize: sanitizeProofSprint,
    validate: validateProofSprint,
    order: PROOFSPRINT_ORDER,
    messages: { failed: ui.form.failed, offline: ui.form.offline },
  });

  if (status === "sent") {
    return (
      <SentState title={t.sentTitle} locale={locale}>
        {t.sentBody.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </SentState>
    );
  }

  const sending = status === "sending";
  const id = (f: ProofSprintField) => `${FORM}-${f}`;

  return (
    <form onSubmit={submit} noValidate className="relative">
      <Honeypot inputRef={honeypot} locale={locale} />
      <h3 className="display-sm">{t.title}</h3>

      <div className="mt-8 grid gap-x-5 gap-y-6 sm:grid-cols-2">
        <TextField locale={locale} id={id("company")} label={t.company} value={values.company} onChange={(v) => set("company", v)} error={errors.company} autoComplete="organization" maxLength={LIMITS.company} disabled={sending} />
        <TextField locale={locale} id={id("email")} label={t.email} type="email" inputMode="email" value={values.email} onChange={(v) => set("email", v)} error={errors.email} autoComplete="email" maxLength={LIMITS.email} disabled={sending} />
        <TextField locale={locale} id={id("name")} label={t.name} optional value={values.name} onChange={(v) => set("name", v)} error={errors.name} autoComplete="name" maxLength={LIMITS.name} disabled={sending} />
        <TextField locale={locale} id={id("deadline")} label={t.deadline} placeholder={t.deadlinePlaceholder} hint={t.deadlineHint} value={values.deadline} onChange={(v) => set("deadline", v)} error={errors.deadline} maxLength={PROOFSPRINT_LIMITS.deadline} disabled={sending} />
        <TextArea
          locale={locale}
          id={id("description")}
          label={t.description}
          placeholder={t.descriptionPlaceholder}
          hint={t.descriptionHint}
          value={values.description}
          onChange={(v) => set("description", v)}
          error={errors.description}
          maxLength={PROOFSPRINT_LIMITS.description}
          disabled={sending}
          className="sm:col-span-2"
        />
        <div className="sm:col-span-2">
          <PrivacyCheck locale={locale} id={id("privacy")} checked={values.privacy} onChange={(v) => set("privacy", v)} error={errors.privacy} disabled={sending} />
        </div>
      </div>

      <div aria-live="polite">
        {serverError && (
          <p className="mt-8 rounded-[var(--radius-sm)] border border-error/50 px-4 py-3 text-[0.9375rem] text-error">
            {serverError}
          </p>
        )}
      </div>

      <div className="mt-10 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-[0.8125rem] text-fg-3">{t.intro}</span>
        <button
          type="submit"
          disabled={sending}
          data-magnetic=""
          className={buttonClass("primary", "w-full !min-h-14 sm:w-auto disabled:cursor-wait disabled:opacity-80")}
        >
          {sending ? t.sending : t.submit}
          {sending ? (
            <span aria-hidden className="size-4 animate-spin rounded-full border-[1.5px] border-current border-t-transparent motion-reduce:animate-none" />
          ) : (
            <ArrowRight className="nudge size-4" />
          )}
        </button>
      </div>

      <p className="mt-6 text-[0.8125rem] leading-relaxed text-fg-3">
        {ui.form.privacyNoteBefore} {locale === "en" ? retentionEn.requests : retention.requests}. {ui.form.privacyNoteRights}{" "}
        <Link href={href("privacy", locale)} className="underline underline-offset-4">
          {ui.form.privacyNoteLink}
        </Link>
        .
      </p>
    </form>
  );
}

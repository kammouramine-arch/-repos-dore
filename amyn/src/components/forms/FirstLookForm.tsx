"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useRef, useState } from "react";
import { buttonClass } from "@/components/ui/Button";
import { ArrowRight } from "@/components/ui/Icons";
import {
  EMPTY_FIRST_LOOK,
  FIRST_LOOK_ORDER,
  SERVICE_BY_SLUG,
  SERVICE_OPTIONS,
  STEPS,
  TIMELINES,
  sanitizeFirstLook,
  validateFirstLook,
  validateStep,
  type FirstLookField,
  type FirstLookValues,
  type ServiceOption,
  type Timeline,
} from "@/lib/forms/first-look";
import { LIMITS, hasErrors } from "@/lib/forms/shared";
import { retention } from "@/lib/legal";
import { ChoiceGroup, Honeypot, PrivacyCheck, SentState, TextArea, TextField } from "./Fields";
import { useFormSubmission } from "./useFormSubmission";

const FORM = "apercu";

/**
 * Lit les paramètres du lien :
 *   ?source=outreach            → la demande est marquée comme faisant suite
 *                                  à un message d'AMYN (rien d'autre n'est déduit) ;
 *   ?business=…                  → pré-remplit l'entreprise, modifiable ;
 *   ?besoin=<slug> / ?service=   → pré-coche le service correspondant.
 * Aucune donnée personnelle ne transite par l'adresse.
 */
function useInitialValues(): FirstLookValues {
  const params = useSearchParams();
  const service = SERVICE_BY_SLUG[params.get("besoin") ?? params.get("service") ?? ""];
  return sanitizeFirstLook({
    ...EMPTY_FIRST_LOOK,
    company: params.get("business") ?? "",
    services: service ? [service] : [],
    source: params.get("source") ?? "site",
  });
}

export function FirstLookForm() {
  return (
    <Suspense fallback={<Form initial={EMPTY_FIRST_LOOK} />}>
      <FormWithParams />
    </Suspense>
  );
}

function FormWithParams() {
  return <Form initial={useInitialValues()} />;
}

/**
 * Le formulaire, en trois étapes. Chaque étape se valide avant de passer à
 * la suivante ; on peut revenir en arrière sans rien perdre. L'envoi n'a
 * lieu qu'à la dernière étape.
 */
function Form({ initial }: { initial: FirstLookValues }) {
  const { values, set, errors, status, serverError, submit, honeypot } = useFormSubmission<
    FirstLookValues,
    FirstLookField
  >({
    formId: FORM,
    endpoint: "/api/premier-apercu",
    initial,
    sanitize: sanitizeFirstLook,
    validate: validateFirstLook,
    order: FIRST_LOOK_ORDER,
  });

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<"next" | "back">("next");
  const [stepErrors, setStepErrors] = useState<Partial<Record<FirstLookField, string>>>({});
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const top = useRef<HTMLDivElement>(null);

  const clean = () => sanitizeFirstLook(values as unknown as Record<string, unknown>);

  /* Après une première tentative sur l'étape, les erreurs se corrigent en
     direct. */
  const update = <K extends keyof FirstLookValues>(field: K, value: FirstLookValues[K]) => {
    set(field, value);
    if (checked.has(step)) {
      const next = sanitizeFirstLook({ ...values, [field]: value } as unknown as Record<string, unknown>);
      setStepErrors(validateStep(next, step));
    }
  };

  const shown = { ...errors, ...stepErrors };
  const e = (f: FirstLookField) => shown[f];

  function go(to: number) {
    setDirection(to > step ? "next" : "back");
    setStep(to);
    setStepErrors({});
    requestAnimationFrame(() => {
      top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      top.current?.querySelector<HTMLElement>("input, textarea")?.focus({ preventScroll: true });
    });
  }

  function next() {
    const found = validateStep(clean(), step);
    setChecked((c) => new Set(c).add(step));
    setStepErrors(found);
    if (hasErrors(found)) {
      const first = STEPS[step].fields.find((f) => found[f]);
      if (first)
        (document.getElementById(`${FORM}-${first}`) ??
          document.querySelector<HTMLElement>(`#${FORM}-${first}-group input`))?.focus();
      return;
    }
    go(step + 1);
  }

  if (status === "sent") {
    return (
      <SentState title="Merci. Nous regardons d'abord votre activité.">
        <p>Avant de vous proposer quoi que ce soit, nous étudions ce que vous nous avez transmis.</p>
        <p>
          Si le projet s&apos;y prête, nous revenons vers vous avec une première piste concrète.
          Sinon, nous vous le disons simplement. Vous n&apos;êtes engagé à rien.
        </p>
      </SentState>
    );
  }

  const sending = status === "sending";
  const id = (f: FirstLookField) => `${FORM}-${f}`;
  const last = step === STEPS.length - 1;

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
      <Honeypot inputRef={honeypot} />

      {/* Progression */}
      <div ref={top} className="scroll-mt-[calc(var(--header-h)+1.5rem)]">
        <ol className="grid grid-cols-3 gap-2" aria-label="Étapes du formulaire">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <button
                type="button"
                disabled={i > step || sending}
                onClick={() => i < step && go(i)}
                aria-current={i === step ? "step" : undefined}
                className="group w-full text-left disabled:cursor-default"
              >
                <span className="block h-1 overflow-hidden rounded-full bg-[rgb(242_238_230/0.1)]">
                  <span
                    className="block h-full origin-left rounded-full bg-gradient-to-r from-gold to-gold-2 transition-transform duration-700 ease-[var(--ease-out)]"
                    style={{ transform: `scaleX(${i < step ? 1 : i === step ? 0.5 : 0})` }}
                  />
                </span>
                <span
                  className={`label mt-3 block text-[0.6875rem] transition-colors ${
                    i === step ? "text-gold" : i < step ? "text-fg-2 group-hover:text-fg" : "text-fg-3"
                  }`}
                >
                  Étape {i + 1}
                </span>
              </button>
            </li>
          ))}
        </ol>

        <h2 className="display-sm mt-8" aria-live="polite">
          {STEPS[step].title}
        </h2>
      </div>

      <div
        key={step}
        className={`mt-8 grid gap-x-5 gap-y-6 sm:grid-cols-2 ${direction === "next" ? "step-in-next" : "step-in-back"}`}
      >
        {step === 0 && (
          <>
            <TextField id={id("name")} label="Nom" value={values.name} onChange={(v) => update("name", v)} error={e("name")} autoComplete="name" maxLength={LIMITS.name} disabled={sending} />
            <TextField id={id("company")} label="Entreprise" value={values.company} onChange={(v) => update("company", v)} error={e("company")} autoComplete="organization" maxLength={LIMITS.company} disabled={sending} />
            <TextField id={id("email")} label="E-mail professionnel" type="email" inputMode="email" value={values.email} onChange={(v) => update("email", v)} error={e("email")} autoComplete="email" maxLength={LIMITS.email} disabled={sending} />
            <TextField id={id("phone")} label="Téléphone" type="tel" inputMode="tel" optional value={values.phone} onChange={(v) => update("phone", v)} error={e("phone")} autoComplete="tel" maxLength={LIMITS.phone} disabled={sending} />
            <TextField
              id={id("presence")}
              label="Votre site, Instagram ou fiche Google"
              optional
              placeholder="monsite.fr, @moncompte…"
              value={values.presence}
              onChange={(v) => update("presence", v)}
              error={e("presence")}
              maxLength={LIMITS.url}
              disabled={sending}
              className="sm:col-span-2"
            />
          </>
        )}

        {step === 1 && (
          <>
            <ChoiceGroup<ServiceOption>
              id={id("services")}
              legend="Les services qui vous intéressent"
              options={SERVICE_OPTIONS}
              multiple
              value={values.services}
              onChange={(v) => update("services", v as ServiceOption[])}
              error={e("services")}
              disabled={sending}
              className="sm:col-span-2"
            />
            <TextField
              id={id("need")}
              label="Votre besoin principal, en une phrase"
              placeholder="Ex. recevoir des réservations sans décrocher le téléphone"
              value={values.need}
              onChange={(v) => update("need", v)}
              error={e("need")}
              maxLength={LIMITS.line}
              disabled={sending}
              className="sm:col-span-2"
            />
            <ChoiceGroup<Timeline>
              id={id("timeline")}
              legend="Échéance souhaitée"
              options={TIMELINES}
              value={values.timeline}
              onChange={(v) => update("timeline", v as Timeline)}
              error={e("timeline")}
              disabled={sending}
              className="sm:col-span-2"
            />
          </>
        )}

        {step === 2 && (
          <>
            <TextArea
              id={id("description")}
              label="Votre activité et votre projet"
              rows={6}
              placeholder="Ce que fait votre entreprise, ce qui ne fonctionne pas aujourd'hui, ce que vous imaginez…"
              value={values.description}
              onChange={(v) => update("description", v)}
              error={e("description")}
              maxLength={LIMITS.text}
              disabled={sending}
              className="sm:col-span-2"
            />
            <div className="sm:col-span-2">
              <PrivacyCheck id={id("privacy")} checked={values.privacy} onChange={(v) => update("privacy", v)} error={e("privacy")} disabled={sending} />
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
          <button
            type="button"
            onClick={() => go(step - 1)}
            disabled={sending}
            data-magnetic=""
            className={buttonClass("secondary", "w-full sm:w-auto")}
          >
            Retour
          </button>
        ) : (
          <span className="text-[0.8125rem] text-fg-3">Deux minutes · Sans engagement</span>
        )}
        <button
          type="submit"
          disabled={sending}
          data-magnetic=""
          className={buttonClass("primary", "w-full !min-h-14 sm:w-auto disabled:cursor-wait disabled:opacity-80")}
        >
          {sending ? "Envoi en cours…" : last ? "Recevoir un premier aperçu" : "Continuer"}
          {sending ? (
            <span aria-hidden className="size-4 animate-spin rounded-full border-[1.5px] border-current border-t-transparent motion-reduce:animate-none" />
          ) : (
            <ArrowRight className="nudge size-4" />
          )}
        </button>
      </div>

      {last && (
        <p className="mt-6 text-[0.8125rem] leading-relaxed text-fg-3">
          Vos informations servent uniquement à étudier et à répondre à votre demande. Elles sont
          conservées {retention.requests}.{" "}
          <Link href="/confidentialite" className="underline underline-offset-4">
            En savoir plus
          </Link>
          .
        </p>
      )}
    </form>
  );
}

/** Mention affichée en tête de page quand on arrive par un message d'AMYN. */
export function OutreachNotice() {
  return (
    <Suspense fallback={null}>
      <OutreachNoticeInner />
    </Suspense>
  );
}

function OutreachNoticeInner() {
  const params = useSearchParams();
  if (params.get("source") !== "outreach") return null;
  return (
    <div className="rounded-[var(--radius-md)] border border-gold/30 bg-[rgb(198_167_106/0.06)] px-5 py-4 text-[0.9375rem] text-fg-2 sm:max-w-xl">
      <p className="label text-gold">Vous arrivez depuis un message d&apos;AMYN</p>
      <p className="mt-2">
        Bienvenue. Voici qui nous sommes — sans obligation.{" "}
        <a href="#message" className="text-fg underline underline-offset-4">
          Pourquoi ce message ?
        </a>
      </p>
    </div>
  );
}

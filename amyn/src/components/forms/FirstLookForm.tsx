"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import {
  AREAS,
  AREA_BY_SERVICE,
  EMPTY_FIRST_LOOK,
  FIRST_LOOK_ORDER,
  sanitizeFirstLook,
  validateFirstLook,
  type Area,
  type FirstLookField,
  type FirstLookValues,
} from "@/lib/forms/first-look";
import { LIMITS } from "@/lib/forms/shared";
import { retention } from "@/lib/legal";
import { ChoiceGroup, Honeypot, PrivacyCheck, SentState, SubmitBar, TextArea, TextField } from "./Fields";
import { useFormSubmission } from "./useFormSubmission";

const FORM = "apercu";

/**
 * Lit les paramètres du lien :
 *   ?source=outreach  → la demande est marquée comme faisant suite à un
 *                       message d'AMYN (rien d'autre n'est déduit) ;
 *   ?business=…       → pré-remplit le nom de l'entreprise, modifiable ;
 *   ?besoin=<service> → pré-coche le point correspondant.
 * Aucune donnée personnelle ne transite par l'adresse.
 */
function useInitialValues(): FirstLookValues {
  const params = useSearchParams();
  const need = AREA_BY_SERVICE[params.get("besoin") ?? ""];
  return sanitizeFirstLook({
    ...EMPTY_FIRST_LOOK,
    company: params.get("business") ?? "",
    areas: need ? [need] : [],
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
  const initial = useInitialValues();
  return <Form initial={initial} />;
}

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

  if (status === "sent") {
    return (
      <SentState title="Merci. Nous regardons d'abord votre activité.">
        <p>
          Avant de vous proposer quoi que ce soit, nous prenons le temps d&apos;étudier
          ce que vous nous avez transmis.
        </p>
        <p>
          Si le projet s&apos;y prête, nous revenons vers vous à l&apos;adresse indiquée
          avec une première piste concrète. Sinon, nous vous le disons simplement.
          Dans les deux cas, vous n&apos;êtes engagé à rien.
        </p>
      </SentState>
    );
  }

  const sending = status === "sending";
  const id = (f: FirstLookField) => `${FORM}-${f}`;

  return (
    <form onSubmit={submit} noValidate aria-describedby={`${FORM}-intro`} className="relative">
      <p id={`${FORM}-intro`} className="sr-only">
        Les champs sans mention « facultatif » sont obligatoires.
      </p>
      <Honeypot inputRef={honeypot} />

      <div className="grid gap-x-6 gap-y-7 sm:grid-cols-2">
        <TextField
          id={id("name")}
          label="Nom"
          value={values.name}
          onChange={(v) => set("name", v)}
          error={errors.name}
          autoComplete="name"
          maxLength={LIMITS.name}
          disabled={sending}
        />
        <TextField
          id={id("company")}
          label="Entreprise"
          value={values.company}
          onChange={(v) => set("company", v)}
          error={errors.company}
          autoComplete="organization"
          maxLength={LIMITS.company}
          disabled={sending}
        />
        <TextField
          id={id("email")}
          label="E-mail professionnel"
          type="email"
          inputMode="email"
          value={values.email}
          onChange={(v) => set("email", v)}
          error={errors.email}
          autoComplete="email"
          maxLength={LIMITS.email}
          disabled={sending}
        />
        <TextField
          id={id("phone")}
          label="Téléphone"
          type="tel"
          inputMode="tel"
          optional
          value={values.phone}
          onChange={(v) => set("phone", v)}
          error={errors.phone}
          autoComplete="tel"
          maxLength={LIMITS.phone}
          disabled={sending}
        />
        <TextField
          id={id("website")}
          label="Site actuel"
          optional
          inputMode="url"
          placeholder="monsite.fr"
          value={values.website}
          onChange={(v) => set("website", v)}
          error={errors.website}
          autoComplete="url"
          maxLength={LIMITS.url}
          disabled={sending}
        />
        <TextField
          id={id("presence")}
          label="Autre présence en ligne"
          optional
          hint="Fiche Google, Instagram, page de réservation…"
          value={values.presence}
          onChange={(v) => set("presence", v)}
          error={errors.presence}
          maxLength={LIMITS.url}
          disabled={sending}
        />

        <ChoiceGroup<Area>
          id={id("areas")}
          legend="Qu'aimeriez-vous améliorer ?"
          options={AREAS}
          multiple
          value={values.areas}
          onChange={(v) => set("areas", v as Area[])}
          error={errors.areas}
          disabled={sending}
          className="sm:col-span-2"
        />

        <TextArea
          id={id("notes")}
          label="Précisions"
          optional
          rows={4}
          placeholder="Ce qui vous gêne aujourd'hui, ce que vous aimeriez obtenir…"
          value={values.notes}
          onChange={(v) => set("notes", v)}
          error={errors.notes}
          maxLength={LIMITS.text}
          disabled={sending}
          className="sm:col-span-2"
        />

        <div className="sm:col-span-2">
          <PrivacyCheck
            id={id("privacy")}
            checked={values.privacy}
            onChange={(v) => set("privacy", v)}
            error={errors.privacy}
            disabled={sending}
          />
        </div>
      </div>

      <div className="mt-10">
        <SubmitBar
          sending={sending}
          label="Recevoir un premier aperçu"
          serverError={serverError}
          note={
            <>
              Vos informations servent uniquement à étudier et à répondre à votre
              demande. Elles sont conservées {retention.requests}.{" "}
              <Link href="/confidentialite" className="underline underline-offset-4">
                En savoir plus
              </Link>
              .
            </>
          }
        />
      </div>
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
    <div className="rounded-[var(--radius-sm)] border border-accent/40 bg-surface px-5 py-4 text-[0.9375rem] text-fg-2 sm:max-w-2xl">
      <p className="label text-accent">Vous arrivez depuis un message d&apos;AMYN</p>
      <p className="mt-2">
        Merci de votre visite. Cette page explique qui nous sommes et ce que nous
        proposons — sans obligation.{" "}
        <a href="#message" className="text-fg underline underline-offset-4">
          Pourquoi vous avez reçu ce message
        </a>
        .
      </p>
    </div>
  );
}

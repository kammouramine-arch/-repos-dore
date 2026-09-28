"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import {
  BUDGETS,
  EMPTY_PROJECT,
  PROJECT_ORDER,
  SERVICE_BY_SLUG,
  SERVICE_OPTIONS,
  SITUATIONS,
  TIMELINES,
  sanitizeProject,
  validateProject,
  type ProjectField,
  type ProjectValues,
  type ServiceOption,
} from "@/lib/forms/project";
import { LIMITS } from "@/lib/forms/shared";
import { retention } from "@/lib/legal";
import { ChoiceGroup, Honeypot, PrivacyCheck, SentState, SubmitBar, TextArea, TextField } from "./Fields";
import { useFormSubmission } from "./useFormSubmission";

const FORM = "projet";

export function ProjectForm() {
  return (
    <Suspense fallback={<Form initial={EMPTY_PROJECT} />}>
      <FormWithParams />
    </Suspense>
  );
}

/* `?service=<slug>` pré-coche le service d'où vient le visiteur. */
function FormWithParams() {
  const params = useSearchParams();
  const service = SERVICE_BY_SLUG[params.get("service") ?? ""];
  return <Form initial={{ ...EMPTY_PROJECT, services: service ? [service] : [] }} />;
}

/** Un bloc du formulaire, numéroté : le formulaire se lit comme un guide. */
function Step({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <fieldset className="border-t border-line pt-8">
      <legend className="float-left mb-7 flex w-full items-baseline gap-4">
        <span className="label text-accent">{number}</span>
        <span className="title">{title}</span>
      </legend>
      <div className="clear-both grid gap-x-6 gap-y-7 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

function Form({ initial }: { initial: ProjectValues }) {
  const { values, set, errors, status, serverError, submit, honeypot } = useFormSubmission<
    ProjectValues,
    ProjectField
  >({
    formId: FORM,
    endpoint: "/api/projet",
    initial,
    sanitize: sanitizeProject,
    validate: validateProject,
    order: PROJECT_ORDER,
  });

  if (status === "sent") {
    return (
      <SentState title="Merci, votre demande est bien arrivée.">
        <p>
          Nous lisons votre description, puis nous revenons vers vous à l&apos;adresse
          indiquée pour préparer un premier échange.
        </p>
        <p>
          Si des informations manquent pour bien comprendre votre projet, nous vous
          poserons simplement la question.
        </p>
      </SentState>
    );
  }

  const sending = status === "sending";
  const id = (f: ProjectField) => `${FORM}-${f}`;

  return (
    <form onSubmit={submit} noValidate className="relative space-y-12">
      <p className="sr-only">Les champs sans mention « facultatif » sont obligatoires.</p>
      <Honeypot inputRef={honeypot} />

      <Step number="01" title="Vous">
        <TextField id={id("name")} label="Nom" value={values.name} onChange={(v) => set("name", v)} error={errors.name} autoComplete="name" maxLength={LIMITS.name} disabled={sending} />
        <TextField id={id("company")} label="Entreprise" value={values.company} onChange={(v) => set("company", v)} error={errors.company} autoComplete="organization" maxLength={LIMITS.company} disabled={sending} />
        <TextField id={id("email")} label="E-mail professionnel" type="email" inputMode="email" value={values.email} onChange={(v) => set("email", v)} error={errors.email} autoComplete="email" maxLength={LIMITS.email} disabled={sending} />
        <TextField id={id("phone")} label="Téléphone" type="tel" inputMode="tel" optional value={values.phone} onChange={(v) => set("phone", v)} error={errors.phone} autoComplete="tel" maxLength={LIMITS.phone} disabled={sending} />
        <TextField id={id("website")} label="Site actuel" optional inputMode="url" placeholder="monsite.fr" value={values.website} onChange={(v) => set("website", v)} error={errors.website} autoComplete="url" maxLength={LIMITS.url} disabled={sending} className="sm:col-span-2" />
      </Step>

      <Step number="02" title="Votre besoin">
        <ChoiceGroup<ServiceOption>
          id={id("services")}
          legend="Services qui vous intéressent"
          options={SERVICE_OPTIONS}
          multiple
          value={values.services}
          onChange={(v) => set("services", v as ServiceOption[])}
          error={errors.services}
          disabled={sending}
          className="sm:col-span-2"
        />
        <ChoiceGroup
          id={id("situation")}
          legend="Votre situation actuelle"
          options={SITUATIONS}
          value={values.situation}
          onChange={(v) => set("situation", v as ProjectValues["situation"])}
          error={errors.situation}
          disabled={sending}
          className="sm:col-span-2"
        />
        <TextField
          id={id("objective")}
          label="Votre objectif principal"
          placeholder="Ex. recevoir des demandes de devis plus complètes"
          value={values.objective}
          onChange={(v) => set("objective", v)}
          error={errors.objective}
          maxLength={LIMITS.line}
          disabled={sending}
          className="sm:col-span-2"
        />
      </Step>

      <Step number="03" title="Cadre">
        <ChoiceGroup
          id={id("budget")}
          legend="Budget envisagé"
          hint="Un ordre de grandeur suffit : il sert à proposer un périmètre réaliste."
          options={BUDGETS}
          value={values.budget}
          onChange={(v) => set("budget", v as ProjectValues["budget"])}
          error={errors.budget}
          disabled={sending}
          className="sm:col-span-2"
        />
        <ChoiceGroup
          id={id("timeline")}
          legend="Échéance souhaitée"
          options={TIMELINES}
          value={values.timeline}
          onChange={(v) => set("timeline", v as ProjectValues["timeline"])}
          error={errors.timeline}
          disabled={sending}
          className="sm:col-span-2"
        />
      </Step>

      <Step number="04" title="Votre projet">
        <TextArea
          id={id("description")}
          label="Description du projet"
          rows={6}
          placeholder="Votre activité, ce qui ne fonctionne pas aujourd'hui, ce que vous imaginez…"
          value={values.description}
          onChange={(v) => set("description", v)}
          error={errors.description}
          maxLength={LIMITS.text}
          disabled={sending}
          className="sm:col-span-2"
        />
        <div className="sm:col-span-2">
          <PrivacyCheck id={id("privacy")} checked={values.privacy} onChange={(v) => set("privacy", v)} error={errors.privacy} disabled={sending} />
        </div>
      </Step>

      <SubmitBar
        sending={sending}
        label="Envoyer ma demande"
        serverError={serverError}
        note={
          <>
            Vos informations servent uniquement à répondre à votre demande et à
            préparer un devis. Elles sont conservées {retention.requests}.{" "}
            <Link href="/confidentialite" className="underline underline-offset-4">
              En savoir plus
            </Link>
            .
          </>
        }
      />
    </form>
  );
}

"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import {
  EMPTY_CONTACT,
  FIELDS,
  HONEYPOT_FIELD,
  LIMITS,
  hasErrors,
  validateContact,
  type ContactErrors,
  type ContactField,
  type ContactValues,
  type FieldDefinition,
} from "@/lib/contact-form";
import { EASE } from "@/lib/motion";

type Status = "idle" | "sending" | "sent";

/**
 * Formulaire de projet.
 *
 * Même langage visuel que le reste du site : pas de champs encadrés, un
 * simple filet sous chaque ligne, qui passe à l'or quand on écrit dedans.
 * Un seul bouton doré, comme partout ailleurs.
 *
 * L'envoi ne peut pas partir deux fois : le bouton est désactivé dès la
 * première soumission et ne se réarme qu'en cas d'échec.
 */
export function ContactForm() {
  const params = useSearchParams();

  /* Le visiteur arrive d'une offre, d'une formule Care ou des services de
     visibilité : on amorce son message plutôt que de lui faire réécrire ce
     qu'il vient de choisir. */
  const opener = (() => {
    const offer = params.get("offre");
    if (offer) return `Bonjour, je suis intéressé par l'offre ${offer}.`;
    const plan = params.get("formule");
    if (plan) return `Bonjour, je souhaite des informations sur AMYN ${plan}.`;
    if (params.get("sujet") === "visibilite")
      return "Bonjour, je souhaite des informations sur les services de visibilité.";
    return null;
  })();

  const [values, setValues] = useState<ContactValues>(() =>
    opener ? { ...EMPTY_CONTACT, message: `${opener}\n\n` } : EMPTY_CONTACT,
  );
  const [errors, setErrors] = useState<ContactErrors>({});
  const [status, setStatus] = useState<Status>("idle");
  const [serverError, setServerError] = useState<string | null>(null);
  /* Tant que le visiteur n'a pas tenté d'envoyer, on ne l'accable pas
     d'erreurs pendant qu'il tape. */
  const [submitted, setSubmitted] = useState(false);
  const honeypot = useRef<HTMLInputElement>(null);

  /* `latest` suit toujours la dernière saisie, y compris quand plusieurs
     champs changent dans le même cycle de rendu. */
  const latest = useRef(values);

  const update = (field: ContactField, value: string) => {
    const next = { ...latest.current, [field]: value };
    latest.current = next;
    setValues(next);
    if (submitted) setErrors(validateContact(next));
  };

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "sending") return;

    setSubmitted(true);
    setServerError(null);

    const found = validateContact(latest.current);
    setErrors(found);
    if (hasErrors(found)) {
      const first = FIELDS.find((f) => found[f.name]);
      if (first) document.getElementById(first.name)?.focus();
      return;
    }

    setStatus("sending");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...latest.current,
          [HONEYPOT_FIELD]: honeypot.current?.value ?? "",
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (data.errors) setErrors(data.errors as ContactErrors);
        setServerError(
          typeof data.error === "string"
            ? data.error
            : "L'envoi a échoué. Réessayez dans un instant.",
        );
        setStatus("idle");
        return;
      }

      /* On ne vide le formulaire qu'une fois la demande réellement partie. */
      latest.current = EMPTY_CONTACT;
      setValues(EMPTY_CONTACT);
      setErrors({});
      setStatus("sent");
    } catch {
      setServerError("Connexion impossible. Vérifiez votre réseau et réessayez.");
      setStatus("idle");
    }
  }

  if (status === "sent") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: EASE }}
        className="flex flex-col items-start"
        role="status"
      >
        <span aria-hidden className="h-14 w-px bg-gradient-to-b from-transparent to-gold" />
        <span aria-hidden className="-mt-[3px] h-[7px] w-[7px] rounded-full bg-gold" />

        <h2 className="display mt-10 text-[clamp(1.6rem,4vw,3rem)] uppercase">
          Demande envoyée.
        </h2>
        <p className="mt-6 max-w-md text-balance text-[0.975rem] leading-[1.75] text-bone-dim">
          Merci. Nous revenons vers vous à l&apos;adresse que vous venez
          d&apos;indiquer, avec une première proposition.
        </p>

        <Link
          href="/"
          className="mt-10 font-display text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-gold transition-colors duration-400 hover:text-gold-light"
        >
          ← Retour à l&apos;accueil
        </Link>
      </motion.div>
    );
  }

  const sending = status === "sending";

  return (
    <form onSubmit={onSubmit} noValidate className="w-full">
      {/* Champ-piège : hors du flux visuel, hors du parcours clavier, et
          annoncé comme absent aux lecteurs d'écran. */}
      <div aria-hidden className="pointer-events-none absolute left-[-9999px] opacity-0">
        <label htmlFor={HONEYPOT_FIELD}>Votre site web</label>
        <input
          ref={honeypot}
          id={HONEYPOT_FIELD}
          name={HONEYPOT_FIELD}
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
        {FIELDS.map((field) => (
          <Field
            key={field.name}
            field={field}
            value={values[field.name]}
            error={errors[field.name]}
            disabled={sending}
            onChange={(value) => update(field.name, value)}
          />
        ))}
      </div>

      <div className="mt-14 flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-8">
        <button
          type="submit"
          disabled={sending}
          className="group relative inline-flex items-center justify-center gap-3 overflow-hidden rounded-full bg-gold px-8 py-4 font-display text-[0.8125rem] font-semibold uppercase tracking-[0.18em] text-ink transition-[transform,background-color] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-gold-light active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 motion-reduce:transition-none"
        >
          {!sending && (
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/45 to-transparent transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-full motion-reduce:hidden"
            />
          )}
          <span className="relative">
            {sending ? "Envoi en cours…" : "Envoyer ma demande"}
          </span>
          {sending && (
            <span
              aria-hidden
              className="relative h-3.5 w-3.5 animate-spin rounded-full border border-ink/30 border-t-ink motion-reduce:animate-none"
            />
          )}
        </button>

        <p aria-live="polite" className="text-[0.85rem] leading-[1.6]">
          {serverError ? (
            <span className="text-[#d08476]">{serverError}</span>
          ) : (
            <span className="text-bone-mute">
              Vos informations ne servent qu&apos;à vous répondre.
            </span>
          )}
        </p>
      </div>
    </form>
  );
}

/** Un champ : filet fin, label en capitales, erreur reliée par aria. */
function Field({
  field,
  value,
  error,
  disabled,
  onChange,
}: {
  field: FieldDefinition;
  value: string;
  error?: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const full = field.type === "textarea";
  const base = `mt-3 block w-full border-b bg-transparent py-3 text-[0.975rem] text-bone outline-none transition-colors duration-300 disabled:opacity-50 ${
    error ? "border-[#c46a5c]" : "border-bone/15 focus:border-gold"
  }`;
  const aria = {
    "aria-invalid": error ? (true as const) : undefined,
    "aria-describedby": error ? `${field.name}-error` : undefined,
  };

  return (
    <div className={full ? "sm:col-span-2" : undefined}>
      <label htmlFor={field.name} className="eyebrow block text-bone-mute">
        {field.label}
        {field.optional && (
          <span className="ml-2 normal-case tracking-normal text-bone-mute/70">
            (facultatif)
          </span>
        )}
      </label>

      {full ? (
        <textarea
          id={field.name}
          name={field.name}
          rows={5}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          maxLength={LIMITS.message.max}
          {...aria}
          className={`${base} resize-y leading-[1.7]`}
        />
      ) : field.type === "select" ? (
        /* `appearance-none` retire le rendu natif du navigateur, qui casserait
           la ligne de filets fins. Le chevron est dessiné en CSS. */
        <div className="relative">
          <select
            id={field.name}
            name={field.name}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            {...aria}
            className={`${base} cursor-pointer appearance-none pr-8 ${
              value ? "text-bone" : "text-bone-mute"
            }`}
          >
            <option value="">Sélectionner…</option>
            {field.options?.map((option) => (
              <option key={option} value={option} className="bg-ink text-bone">
                {option}
              </option>
            ))}
          </select>
          <span
            aria-hidden
            className="pointer-events-none absolute bottom-4 right-1 h-1.5 w-1.5 rotate-45 border-b border-r border-bone-mute"
          />
        </div>
      ) : (
        <input
          id={field.name}
          name={field.name}
          type={field.type}
          inputMode={field.type === "tel" ? "tel" : undefined}
          autoComplete={field.autoComplete}
          placeholder={field.placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          {...aria}
          className={`${base} placeholder:text-bone-mute/60`}
        />
      )}

      {error && (
        <p id={`${field.name}-error`} className="mt-2.5 text-[0.8rem] text-[#d08476]">
          {error}
        </p>
      )}
    </div>
  );
}

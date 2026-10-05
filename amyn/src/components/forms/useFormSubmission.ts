"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { HONEYPOT_FIELD, hasErrors } from "@/lib/forms/shared";

type Status = "idle" | "sending" | "sent";

/**
 * État et envoi d'un formulaire.
 *
 * - Les erreurs n'apparaissent qu'après une première tentative d'envoi :
 *   on ne corrige pas quelqu'un qui est encore en train d'écrire.
 * - Le formulaire ne peut pas partir deux fois : l'envoi verrouille le
 *   bouton jusqu'à la réponse.
 * - En cas d'erreur, le focus va au premier champ concerné.
 */
export function useFormSubmission<V extends object, F extends string>({
  formId,
  endpoint,
  initial,
  sanitize,
  validate,
  order,
  messages = {
    failed: "L'envoi a échoué. Réessayez dans un instant.",
    offline: "Connexion impossible. Vérifiez votre réseau, puis réessayez.",
  },
}: {
  /** Messages génériques, dans la langue du visiteur. */
  messages?: { failed: string; offline: string; timeout?: string };
  formId: string;
  endpoint: string;
  initial: V;
  sanitize: (raw: Record<string, unknown>) => V;
  validate: (values: V) => Partial<Record<F, string>>;
  order: F[];
}) {
  const [values, setValues] = useState<V>(initial);
  const [errors, setErrors] = useState<Partial<Record<F, string>>>({});
  const [status, setStatus] = useState<Status>("idle");
  const [serverError, setServerError] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);
  const honeypot = useRef<HTMLInputElement>(null);
  const startedAt = useRef(0);
  const latest = useRef(values);
  /* Avant le chargement de JavaScript, l'envoi est impossible : le
     formulaire ne part jamais « nativement » (données dans l'adresse). */
  const ready = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  function set<K extends keyof V>(field: K, value: V[K]) {
    const next = { ...latest.current, [field]: value };
    latest.current = next;
    setValues(next);
    if (attempted) setErrors(validate(sanitize(next as Record<string, unknown>)));
  }

  function focusField(field: F) {
    const target =
      document.getElementById(`${formId}-${field}`) ??
      document.querySelector<HTMLElement>(`#${formId}-${field}-group input`);
    target?.focus();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "sending") return;

    setAttempted(true);
    setServerError(null);

    const clean = sanitize(latest.current as Record<string, unknown>);
    const found = validate(clean);
    setErrors(found);
    if (hasErrors(found)) {
      const first = order.find((f) => found[f]);
      if (first) focusField(first);
      return;
    }

    setStatus("sending");
    /* Réseau très lent : on n'attend pas indéfiniment, et on ne prétend
       jamais que la demande est partie. */
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 20_000);
    try {
      const response = await fetch(endpoint, {
        signal: controller.signal,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...clean,
          elapsed: Date.now() - startedAt.current,
          [HONEYPOT_FIELD]: honeypot.current?.value ?? "",
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (data.errors) {
          setErrors(data.errors);
          const first = order.find((f) => data.errors[f]);
          if (first) focusField(first);
        }
        setServerError(
          typeof data.error === "string" ? data.error : messages.failed,
        );
        setStatus("idle");
        return;
      }

      setStatus("sent");
    } catch (error) {
      const timedOut = error instanceof DOMException && error.name === "AbortError";
      setServerError(timedOut ? (messages.timeout ?? messages.offline) : messages.offline);
      setStatus("idle");
    } finally {
      window.clearTimeout(timer);
    }
  }

  return { values, set, errors, status, serverError, submit, honeypot, ready };
}

const noop = () => () => {};

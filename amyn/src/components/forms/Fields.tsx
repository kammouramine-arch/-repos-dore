"use client";

import Link from "next/link";
import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import { ArrowRight, Check } from "@/components/ui/Icons";
import { buttonClass } from "@/components/ui/Button";
import { HONEYPOT_FIELD } from "@/lib/forms/shared";

/**
 * Champs de formulaire.
 *
 * Chaque champ a un vrai `<label>`, son message d'erreur est relié par
 * `aria-describedby`, et l'état invalide est annoncé par `aria-invalid`.
 * Les choix sont de vraies cases et de vrais boutons radio, stylés en
 * pastilles : clavier et lecteurs d'écran fonctionnent comme d'habitude.
 */

const fieldBase =
  "mt-2.5 block w-full rounded-[var(--radius-sm)] border bg-surface px-4 py-3.5 text-[1rem] text-fg outline-none transition-colors duration-300 placeholder:text-fg-3/70 focus:border-accent disabled:opacity-60";

function Hint({ id, error, hint }: { id: string; error?: string; hint?: string }) {
  if (error)
    return (
      <p id={`${id}-error`} className="mt-2 text-[0.875rem] text-error">
        {error}
      </p>
    );
  if (hint)
    return (
      <p id={`${id}-hint`} className="mt-2 text-[0.8125rem] text-fg-3">
        {hint}
      </p>
    );
  return null;
}

function Optional() {
  return <span className="ml-1.5 text-fg-3">(facultatif)</span>;
}

export function TextField({
  id,
  label,
  value,
  onChange,
  error,
  hint,
  optional,
  type = "text",
  autoComplete,
  inputMode,
  placeholder,
  disabled,
  maxLength,
  className = "",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  optional?: boolean;
  type?: "text" | "email" | "tel";
  autoComplete?: string;
  inputMode?: "text" | "email" | "tel" | "url";
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
  className?: string;
}) {
  const described = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="text-[0.9375rem] font-medium text-fg">
        {label}
        {optional && <Optional />}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        inputMode={inputMode}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={maxLength}
        required={!optional}
        aria-invalid={error ? true : undefined}
        aria-describedby={described}
        className={`${fieldBase} ${error ? "border-error" : "border-line"}`}
      />
      <Hint id={id} error={error} hint={hint} />
    </div>
  );
}

export function TextArea({
  id,
  label,
  value,
  onChange,
  error,
  hint,
  optional,
  rows = 5,
  maxLength,
  placeholder,
  disabled,
  className = "",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  optional?: boolean;
  rows?: number;
  maxLength?: number;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  const described = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="text-[0.9375rem] font-medium text-fg">
        {label}
        {optional && <Optional />}
      </label>
      <textarea
        id={id}
        name={id}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
        placeholder={placeholder}
        disabled={disabled}
        required={!optional}
        aria-invalid={error ? true : undefined}
        aria-describedby={described}
        className={`${fieldBase} resize-y leading-relaxed ${error ? "border-error" : "border-line"}`}
      />
      <Hint id={id} error={error} hint={hint} />
    </div>
  );
}

/**
 * Groupe de choix (cases à cocher ou boutons radio) présenté en pastilles.
 * Le `<fieldset>` et sa `<legend>` donnent la question aux lecteurs
 * d'écran.
 */
export function ChoiceGroup<T extends string>({
  id,
  legend,
  options,
  value,
  onChange,
  multiple = false,
  error,
  hint,
  disabled,
  className = "",
}: {
  id: string;
  legend: string;
  options: readonly T[];
  value: T[] | T | "";
  onChange: (value: T[] | T) => void;
  multiple?: boolean;
  error?: string;
  hint?: string;
  disabled?: boolean;
  className?: string;
}) {
  const selected = (option: T) =>
    Array.isArray(value) ? value.includes(option) : value === option;

  const toggle = (option: T) => {
    if (!multiple) return onChange(option);
    const list = Array.isArray(value) ? value : [];
    onChange(list.includes(option) ? list.filter((v) => v !== option) : [...list, option]);
  };

  const described = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <fieldset
      id={`${id}-group`}
      className={className}
      aria-describedby={described}
      aria-invalid={error ? true : undefined}
    >
      <legend className="text-[0.9375rem] font-medium text-fg">
        {legend}
        {multiple && <span className="ml-1.5 text-fg-3">(plusieurs choix possibles)</span>}
      </legend>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((option, i) => {
          const on = selected(option);
          const inputId = `${id}-${i}`;
          return (
            <label
              key={option}
              htmlFor={inputId}
              className={`relative inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 text-[0.9375rem] transition-colors duration-300 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent ${
                on
                  ? "border-fg bg-fg text-canvas"
                  : `${error ? "border-error" : "border-line-strong"} text-fg-2 hover:border-fg hover:text-fg`
              } ${disabled ? "pointer-events-none opacity-60" : ""}`}
            >
              <input
                id={inputId}
                type={multiple ? "checkbox" : "radio"}
                name={id}
                value={option}
                checked={on}
                onChange={() => toggle(option)}
                disabled={disabled}
                className="sr-only"
              />
              {on && multiple && <Check className="size-3.5" />}
              {option}
            </label>
          );
        })}
      </div>
      <Hint id={id} error={error} hint={hint} />
    </fieldset>
  );
}

/** Case de prise de connaissance de la politique de confidentialité. */
export function PrivacyCheck({
  id,
  checked,
  onChange,
  error,
  disabled,
}: {
  id: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  error?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="flex cursor-pointer items-start gap-3.5">
        <span className="relative mt-0.5 flex size-5 shrink-0">
          <input
            id={id}
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            disabled={disabled}
            required
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-error` : undefined}
            className={`peer size-5 cursor-pointer appearance-none rounded-[var(--radius-xs)] border bg-surface checked:border-fg checked:bg-fg ${
              error ? "border-error" : "border-line-strong"
            }`}
          />
          <Check className="pointer-events-none absolute inset-0 m-auto hidden size-3.5 text-canvas peer-checked:block" />
        </span>
        <span className="text-[0.9375rem] leading-relaxed text-fg-2">
          J&apos;ai pris connaissance de la{" "}
          <Link href="/confidentialite" target="_blank" className="text-fg underline underline-offset-4">
            politique de confidentialité
          </Link>
          .
        </span>
      </label>
      <Hint id={id} error={error} />
    </div>
  );
}

/** Champ-piège : hors écran, hors clavier, masqué aux lecteurs d'écran. */
export function Honeypot({ inputRef }: { inputRef: RefObject<HTMLInputElement | null> }) {
  return (
    <div aria-hidden className="pointer-events-none absolute -left-[9999px] h-px w-px overflow-hidden opacity-0">
      <label htmlFor={HONEYPOT_FIELD}>Ne pas remplir</label>
      <input ref={inputRef} id={HONEYPOT_FIELD} name={HONEYPOT_FIELD} type="text" tabIndex={-1} autoComplete="off" />
    </div>
  );
}

export function SubmitBar({
  sending,
  label,
  serverError,
  note,
}: {
  sending: boolean;
  label: string;
  serverError: string | null;
  note: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div aria-live="polite" className="min-h-0">
        {serverError && (
          <p className="rounded-[var(--radius-sm)] border border-error/50 px-4 py-3 text-[0.9375rem] text-error">
            {serverError}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-8">
        <button
          type="submit"
          disabled={sending}
          aria-disabled={sending}
          className={buttonClass("primary", "disabled:cursor-wait disabled:opacity-80")}
        >
          {sending ? "Envoi en cours…" : label}
          {sending ? (
            <span
              aria-hidden
              className="size-4 animate-spin rounded-full border-[1.5px] border-current border-t-transparent motion-reduce:animate-none"
            />
          ) : (
            <ArrowRight className="nudge size-4" />
          )}
        </button>
        <p className="max-w-md text-[0.8125rem] leading-relaxed text-fg-3">{note}</p>
      </div>
    </div>
  );
}

/** État « envoyé » : annoncé et mis au focus pour les lecteurs d'écran. */
export function SentState({ title, children }: { title: string; children: ReactNode }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);

  return (
    <div role="status" className="rise">
      <span aria-hidden className="flex size-12 items-center justify-center rounded-full border border-accent text-accent">
        <Check className="size-5" />
      </span>
      <h2 ref={heading} tabIndex={-1} className="display-md mt-8 outline-none">
        {title}
      </h2>
      <div className="mt-6 max-w-xl space-y-4 text-fg-2">{children}</div>
      <Link href="/" className="link-line mt-10 inline-flex min-h-11 items-center text-fg">
        Retour à l&apos;accueil
      </Link>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import { Check } from "@/components/ui/Icons";
import { HONEYPOT_FIELD } from "@/lib/forms/shared";
import type { Locale } from "@/lib/i18n/config";
import { href } from "@/lib/i18n/routes";
import { getUi } from "@/lib/i18n/ui";

/**
 * Champs de formulaire.
 *
 * Chaque champ a un vrai `<label>`, son message d'erreur est relié par
 * `aria-describedby`, et l'état invalide est annoncé par `aria-invalid`.
 * Les choix sont de vraies cases et de vrais boutons radio, stylés en
 * pastilles : clavier et lecteurs d'écran fonctionnent comme d'habitude.
 */

const fieldBase =
  "mt-2.5 block w-full rounded-[var(--radius-sm)] border bg-surface px-4 py-3.5 text-[1rem] text-fg transition-colors duration-300 placeholder:text-fg-3/70 focus:border-accent disabled:opacity-60";

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

function Optional({ locale }: { locale: Locale }) {
  return <span className="ml-1.5 text-fg-3">{getUi(locale).form.optional}</span>;
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
  locale = "fr",
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
  locale?: Locale;
}) {
  const described = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="text-[0.9375rem] font-medium text-fg">
        {label}
        {optional && <Optional locale={locale} />}
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
  locale = "fr",
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
  locale?: Locale;
}) {
  const described = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="text-[0.9375rem] font-medium text-fg">
        {label}
        {optional && <Optional locale={locale} />}
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
  locale = "fr",
  labelFor = (option: T) => option,
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
  locale?: Locale;
  /** Libellé affiché d'une option (la valeur envoyée ne change pas). */
  labelFor?: (option: T) => string;
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
        {multiple && <span className="ml-1.5 text-fg-3">{getUi(locale).form.multiple}</span>}
      </legend>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((option, i) => {
          const on = selected(option);
          const inputId = `${id}-${i}`;
          return (
            <label
              key={option}
              htmlFor={inputId}
              className={`relative inline-flex min-h-11 cursor-pointer select-none items-center gap-2 rounded-full border px-4 text-[0.9375rem] transition-[background-color,border-color,color,transform] duration-300 active:scale-95 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent ${
                on
                  ? "chip-pop border-fg bg-fg text-canvas shadow-[0_8px_24px_-12px_rgb(198_167_106/0.6)]"
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
              {labelFor(option)}
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
  locale = "fr",
}: {
  id: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  error?: string;
  disabled?: boolean;
  locale?: Locale;
}) {
  const t = getUi(locale).form;
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
          {t.privacyBefore}{" "}
          <Link href={href("privacy", locale)} target="_blank" className="text-fg underline underline-offset-4">
            {t.privacyLink}
          </Link>
          .
        </span>
      </label>
      <Hint id={id} error={error} />
    </div>
  );
}

/** Champ-piège : hors écran, hors clavier, masqué aux lecteurs d'écran. */
export function Honeypot({
  inputRef,
  locale = "fr",
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  locale?: Locale;
}) {
  return (
    <>
      {/* Sans JavaScript, le formulaire ne peut pas partir : on le dit. */}
      <noscript>
        <p className="mb-6 rounded-[var(--radius-sm)] border border-line-strong px-4 py-3 text-[0.9375rem] text-fg-2">
          {getUi(locale).form.noscript}
        </p>
      </noscript>
      <div aria-hidden className="pointer-events-none absolute -left-[9999px] h-px w-px overflow-hidden opacity-0">
        <label htmlFor={HONEYPOT_FIELD}>{getUi(locale).form.honeypot}</label>
        <input ref={inputRef} id={HONEYPOT_FIELD} name={HONEYPOT_FIELD} type="text" tabIndex={-1} autoComplete="off" />
      </div>
    </>
  );
}

/** État « envoyé » : annoncé et mis au focus pour les lecteurs d'écran. */
export function SentState({
  title,
  children,
  locale = "fr",
}: {
  title: string;
  children: ReactNode;
  locale?: Locale;
}) {
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
      <Link href={href("home", locale)} className="link-line mt-10 inline-flex min-h-11 items-center text-fg">
        {getUi(locale).form.backHome}
      </Link>
    </div>
  );
}

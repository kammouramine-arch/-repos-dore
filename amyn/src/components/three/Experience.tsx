"use client";

import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/i18n/config";
import { HONEYPOT_FIELD } from "@/lib/forms/shared";

export function ApartmentHero({ locale }: { locale: Locale }) {
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    const el = video.current;
    if (!el) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !reduced.matches && !connection?.saveData) void el.play().catch(() => {});
      else el.pause();
    });
    observer.observe(el);
    const onPreference = () => { if (reduced.matches) el.pause(); };
    reduced.addEventListener("change", onPreference);
    return () => { observer.disconnect(); reduced.removeEventListener("change", onPreference); };
  }, []);
  return <>
    <video ref={video} className="a3-hero-film" muted loop playsInline preload="none" poster="/3d/poster.webp" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} aria-hidden="true">
      <source src="/3d/hero.mp4" type="video/mp4" />
    </video>
    <button className="a3-motion" onClick={() => { if (video.current?.paused) void video.current.play().catch(() => {}); else video.current?.pause(); }} aria-label={locale === "en" ? (playing ? "Pause background film" : "Play background film") : (playing ? "Mettre le film en pause" : "Lire le film")}>
      {playing ? "Ⅱ" : "▷"} {locale === "en" ? "24-second film" : "Film de 24 secondes"}
    </button>
  </>;
}

export function InteractiveTour({ locale }: { locale: Locale }) {
  const [open, setOpen] = useState(false);
  const en = locale === "en";
  return <div className="a3-tour-stage">
    {open ? <>
      <iframe src={`/3d/tour.html?lang=${locale}`} title={en ? "Atelier Lumière interactive apartment tour" : "Visite interactive de l’appartement Atelier Lumière"} allow="fullscreen" allowFullScreen />
      <button className="a3-close" onClick={() => setOpen(false)}>{en ? "Close tour ×" : "Fermer la visite ×"}</button>
    </> : <>
      {/* Original scene still, deliberately served locally without a third party. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/3d/poster.webp" alt={en ? "Original 3D living room with linen sofa, oak floor and limestone tables" : "Salon 3D original : canapé en lin, parquet en chêne et tables en pierre"} width="1920" height="1080" loading="lazy" />
      <div className="a3-tour-cover"><span className="a3-kicker">ATELIER LUMIÈRE · {en ? "FICTIONAL DEMO" : "DÉMO FICTIVE"}</span><button className="a3-button" onClick={() => setOpen(true)}>{en ? "Enter the apartment" : "Entrer dans l’appartement"} ↗</button><p>{en ? "Four rooms. Your point of view. No download." : "Quatre espaces. Votre point de vue. Sans téléchargement."}</p></div>
    </>}
  </div>;
}

export function ThreeInquiry({ locale }: { locale: Locale }) {
  const en = locale === "en";
  const started = useRef(0);
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");
  return <form className="a3-form" onFocus={() => { if (!started.current) started.current = Date.now(); }} onSubmit={async event => {
    event.preventDefault();
    if (state === "sending") return;
    const data = new FormData(event.currentTarget);
    setState("sending"); setMessage("");
    try {
      const response = await fetch("/api/3d", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...Object.fromEntries(data), privacy: data.get("privacy") === "on", lang: locale, elapsed: Date.now() - started.current }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || (en ? "Sending failed." : "Échec de l’envoi."));
      setState("sent"); setMessage(en ? "Your inquiry has been sent. We’ll reply by email to discuss scope." : "Votre demande a été envoyée. Nous vous répondrons par e-mail pour préciser le projet.");
    } catch (error) { setState("error");setMessage(error instanceof Error ? error.message : (en ? "Sending unavailable. Email contact@amyn.agency." : "Envoi indisponible. Écrivez à contact@amyn.agency.")); }
  }}>
    <div className="a3-form-row"><label>{en ? "Your name" : "Votre nom"}<input name="name" autoComplete="name" required minLength={2} maxLength={100} /></label><label>{en ? "Company / studio" : "Entreprise / studio"}<input name="company" autoComplete="organization" required minLength={2} maxLength={160} /></label></div>
    <label>E-mail<input name="email" type="email" autoComplete="email" required maxLength={254} /></label>
    <label>{en ? "Your project" : "Votre projet"}<textarea name="description" required minLength={15} maxLength={1500} rows={4} placeholder={en ? "Property type, rooms, existing plans, intended use and deadline…" : "Type de bien, pièces, plans disponibles, usage souhaité et échéance…"} /></label>
    <div className="a3-trap" aria-hidden="true"><label>Fax<input name={HONEYPOT_FIELD} tabIndex={-1} autoComplete="off" /></label></div>
    <label className="a3-consent"><input name="privacy" type="checkbox" required /><span>{en ? "I have read the " : "J’ai pris connaissance de la "}<a href={en ? "/en/privacy" : "/confidentialite"}>{en ? "privacy policy" : "politique de confidentialité"}</a>. {en ? "My details are used to handle this inquiry." : "Mes coordonnées servent à traiter cette demande."}</span></label>
    <button className="a3-button" disabled={state === "sending" || state === "sent"}>{state === "sending" ? (en ? "Sending…" : "Envoi…") : (en ? "Discuss my space ↗" : "Parlons de votre espace ↗")}</button>
    <p role="status" aria-live="polite" className={state === "error" ? "a3-error" : ""}>{message}</p>
    <p className="a3-fine">{en ? "Prefer email?" : "Vous préférez l’e-mail ?"} <a href="mailto:contact@amyn.agency?subject=Projet%20AMYN%203D">contact@amyn.agency</a></p>
  </form>;
}

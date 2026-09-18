'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Mouvement du site marketing.
 *
 * Trois outils, rien de plus : une révélation au défilement, un compteur qui
 * monte vers sa valeur, et une lecture de « prefers-reduced-motion ». Tout
 * repose sur opacité et transform ; sous réduction de mouvement, les
 * éléments apparaissent simplement à leur place.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return reduced;
}

/** Ajoute `is-visible` quand l'élément entre dans la fenêtre, une seule fois. */
export function Reveal({
  as: Tag = 'div',
  delay = 0,
  scale = false,
  className,
  children,
  ...props
}: {
  as?: 'div' | 'section' | 'li' | 'p' | 'span' | 'article' | 'header' | 'ol' | 'ul';
  delay?: number;
  scale?: boolean;
  className?: string;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLElement>) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    if (!('IntersectionObserver' in window)) {
      element.classList.add('is-visible');
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            element.classList.add('is-visible');
            observer.disconnect();
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return (
    // Les balises acceptées partagent l'interface HTMLElement ; le typage par balise est plus strict que nécessaire.
    <Tag
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ref={ref as any}
      className={cn(scale ? 'reveal-scale' : 'reveal', className)}
      style={{ '--reveal-delay': `${delay}ms` } as React.CSSProperties}
      {...props}
    >
      {children}
    </Tag>
  );
}

/** Compte de 0 à `value` quand visible ; affiche la valeur finale sans mouvement si demandé. */
export function CountUp({
  value,
  format = (n) => String(Math.round(n)),
  duration = 1100,
  className,
}: {
  value: number;
  format?: (n: number) => string;
  duration?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const ref = React.useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = React.useState(() => format(value));
  const started = React.useRef(false);

  React.useEffect(() => {
    const element = ref.current;
    if (!element || reduced || started.current) return undefined;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      started.current = true;
      observer.disconnect();
      const start = performance.now();
      const tick = (now: number) => {
        const progress = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplay(format(value * eased));
        if (progress < 1) requestAnimationFrame(tick);
      };
      setDisplay(format(0));
      requestAnimationFrame(tick);
    }, { threshold: 0.4 });
    observer.observe(element);
    return () => observer.disconnect();
  }, [value, format, duration, reduced]);

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  );
}

/**
 * Parallaxe de pointeur : écrit des variables CSS sur l'élément, dans une
 * seule frame, sans re-rendu React. Inactif sur écran tactile et sous
 * réduction de mouvement.
 */
export function usePointerVariables<T extends HTMLElement>(strength = 1) {
  const ref = React.useRef<T | null>(null);
  React.useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    if (window.matchMedia('(pointer: coarse)').matches) return undefined;
    let frame = 0;
    let target = { x: 0, y: 0 };
    const apply = () => {
      frame = 0;
      element.style.setProperty('--px', target.x.toFixed(3));
      element.style.setProperty('--py', target.y.toFixed(3));
    };
    const onMove = (event: PointerEvent) => {
      const rect = element.getBoundingClientRect();
      target = {
        x: ((event.clientX - rect.left) / rect.width - 0.5) * 2 * strength,
        y: ((event.clientY - rect.top) / rect.height - 0.5) * 2 * strength,
      };
      if (!frame) frame = requestAnimationFrame(apply);
    };
    const onLeave = () => {
      target = { x: 0, y: 0 };
      if (!frame) frame = requestAnimationFrame(apply);
    };
    element.addEventListener('pointermove', onMove, { passive: true });
    element.addEventListener('pointerleave', onLeave);
    return () => {
      element.removeEventListener('pointermove', onMove);
      element.removeEventListener('pointerleave', onLeave);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [strength]);
  return ref;
}

const EUROS = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

/** Montant en euros animé, utilisable depuis un composant serveur (aucune fonction passée en prop). */
export function CountEuros({ value, className }: { value: number; className?: string }) {
  return <CountUp value={value} format={formatEuros} className={className} />;
}

function formatEuros(n: number) {
  return `${EUROS.format(Math.round(n))} €`;
}

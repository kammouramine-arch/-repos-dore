'use client';

import * as React from 'react';
import { CheckCircle2, Eye, Sparkles } from 'lucide-react';
import { AppPreview } from './app-preview';

/**
 * Scène du produit dans le héros : la surface logicielle émerge, flotte
 * légèrement et répond au pointeur par une perspective de deux degrés au
 * plus. Deux repères contextuels flottent à côté sur grand écran.
 */
export function ProductStage() {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    if (window.matchMedia('(pointer: coarse)').matches) return undefined;
    let frame = 0;
    let tilt = { x: 0, y: 0 };
    const apply = () => {
      frame = 0;
      element.style.setProperty('--tilt-x', `${tilt.x.toFixed(2)}deg`);
      element.style.setProperty('--tilt-y', `${tilt.y.toFixed(2)}deg`);
    };
    const onMove = (event: PointerEvent) => {
      const rect = element.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      tilt = { x: -y * 2.2, y: x * 2.6 };
      if (!frame) frame = requestAnimationFrame(apply);
    };
    const onLeave = () => {
      tilt = { x: 0, y: 0 };
      if (!frame) frame = requestAnimationFrame(apply);
    };
    element.addEventListener('pointermove', onMove, { passive: true });
    element.addEventListener('pointerleave', onLeave);
    return () => {
      element.removeEventListener('pointermove', onMove);
      element.removeEventListener('pointerleave', onLeave);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="product-stage relative mx-auto max-w-5xl">
      {/* Halo sous la surface : la lumière du héros se prolonge derrière le produit. */}
      <div className="pointer-events-none absolute inset-x-[10%] -top-10 h-[60%] rounded-full bg-[radial-gradient(closest-side,rgba(47,82,232,0.18),rgba(47,82,232,0))] blur-2xl" aria-hidden />

      <div ref={ref} className="product-surface relative">
        <div className="rounded-[22px] bg-gradient-to-b from-white/80 to-white/30 p-1.5 shadow-[0_1px_0_rgba(255,255,255,0.9)_inset] ring-1 ring-line/70">
          <AppPreview />
        </div>

        {/* Repères contextuels : ce que le logiciel vient de faire. */}
        <div
          className="hero-in float-soft absolute left-0 top-[24%] hidden -translate-x-[75%] items-center gap-2.5 2xl:-translate-x-[88%] rounded-[14px] border border-line bg-canvas/95 px-3.5 py-2.5 shadow-md backdrop-blur min-[1440px]:flex"
          style={{ '--hero-delay': '1200ms', animationDelay: '1.2s, 0s' } as React.CSSProperties}
          aria-hidden
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-accent-soft text-accent">
            <Sparkles className="h-4 w-4" />
          </span>
          <span>
            <span className="block text-[12.5px] font-semibold text-ink">Devis généré</span>
            <span className="block text-[11.5px] text-muted">Remplacement du siphon · 214,50 €</span>
          </span>
        </div>

        <div
          className="hero-in float-soft absolute right-0 top-[10%] hidden translate-x-[75%] items-center gap-2.5 2xl:translate-x-[88%] rounded-[14px] border border-line bg-canvas/95 px-3.5 py-2.5 shadow-md backdrop-blur min-[1440px]:flex"
          style={{ '--hero-delay': '1450ms', animationDelay: '1.45s, 1.8s' } as React.CSSProperties}
          aria-hidden
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-info-soft text-info">
            <Eye className="h-4 w-4" />
          </span>
          <span>
            <span className="block text-[12.5px] font-semibold text-ink">Client a consulté</span>
            <span className="block text-[11.5px] text-muted">Sophie L. · il y a 2 min</span>
          </span>
        </div>

        <div
          className="hero-in float-soft absolute bottom-[16%] right-0 hidden translate-x-[75%] items-center gap-2.5 2xl:translate-x-[88%] rounded-[14px] border border-success/25 bg-canvas/95 px-3.5 py-2.5 shadow-md backdrop-blur min-[1440px]:flex"
          style={{ '--hero-delay': '1700ms', animationDelay: '1.7s, 3.4s' } as React.CSSProperties}
          aria-hidden
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-success-soft text-success">
            <CheckCircle2 className="h-4 w-4" />
          </span>
          <span>
            <span className="block text-[12.5px] font-semibold text-ink">1 950 € récupérés</span>
            <span className="block text-[11.5px] text-muted">Relance acceptée · M. Martin</span>
          </span>
        </div>
      </div>
    </div>
  );
}

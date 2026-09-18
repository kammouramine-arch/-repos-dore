'use client';

import * as React from 'react';
import { usePointerVariables } from './motion';

/**
 * Atmosphère du héros.
 *
 * Trois couches, toutes en transform/opacité :
 * 1. une base claire avec une lumière bleue radiale derrière le titre ;
 * 2. deux formes de lumière floues qui dérivent très lentement ;
 * 3. un motif de flux « voix → information → document » en traits fins,
 *    quasi imperceptible, qui suggère ce que fait le produit sans l'écrire.
 * Le pointeur déplace l'illumination de quelques pixels sur ordinateur.
 */
export function HeroBackdrop() {
  const ref = usePointerVariables<HTMLDivElement>(1);
  return (
    <div
      ref={ref}
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      aria-hidden
      style={{ '--px': 0, '--py': 0 } as React.CSSProperties}
    >
      {/* Base : blanc chaud vers la surface, sans grille. */}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#ffffff_0%,#fbfcff_55%,#f5f7fb_100%)]" />

      {/* Lumière principale derrière le titre, guidée par le pointeur. */}
      <div
        className="absolute left-1/2 top-[-260px] h-[820px] w-[1180px] rounded-full opacity-90 blur-3xl"
        style={{
          background: 'radial-gradient(closest-side, rgba(47,82,232,0.22), rgba(111,140,255,0.10) 45%, rgba(255,255,255,0) 72%)',
          transform: 'translate3d(calc(-50% + var(--px) * 14px), calc(var(--py) * 10px), 0)',
          transition: 'transform 0.9s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      />

      {/* Formes de lumière secondaires, dérive lente. */}
      <div className="drift-a absolute left-[8%] top-[18%] h-[420px] w-[420px] rounded-full bg-[radial-gradient(closest-side,rgba(111,140,255,0.16),rgba(111,140,255,0))] blur-2xl" />
      <div className="drift-b absolute right-[6%] top-[30%] h-[520px] w-[520px] rounded-full bg-[radial-gradient(closest-side,rgba(47,82,232,0.12),rgba(47,82,232,0))] blur-2xl" />

      {/* Flux : voix (ondes) → nœuds d'information → lignes d'un document. */}
      <svg
        className="absolute left-1/2 top-[120px] hidden w-[1360px] md:block"
        viewBox="0 0 1360 560"
        fill="none"
        style={{
          transform: 'translate3d(calc(-50% + var(--px) * -8px), calc(var(--py) * -6px), 0)',
          transition: 'transform 1.2s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        <defs>
          <linearGradient id="hero-flow" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#2F52E8" stopOpacity="0" />
            <stop offset="0.5" stopColor="#2F52E8" stopOpacity="0.32" />
            <stop offset="1" stopColor="#2F52E8" stopOpacity="0" />
          </linearGradient>
          {/* Masque : le motif vit dans les marges, le centre reste net pour le titre. */}
          <radialGradient id="hero-mask-fill" cx="0.5" cy="0.45" r="0.5">
            <stop offset="0.42" stopColor="#000" />
            <stop offset="0.72" stopColor="#fff" />
          </radialGradient>
          <mask id="hero-mask">
            <rect width="1360" height="560" fill="url(#hero-mask-fill)" />
          </mask>
        </defs>

        <g mask="url(#hero-mask)">
          {/* Ondes vocales, à gauche. */}
          <g transform="translate(96 250)" stroke="#2F52E8" strokeWidth="2" strokeLinecap="round" opacity="0.26">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((index) => {
              const heights = [10, 22, 34, 18, 42, 26, 14, 30, 12];
              return (
                <line
                  key={index}
                  x1={index * 12}
                  x2={index * 12}
                  y1={-heights[index]! / 2}
                  y2={heights[index]! / 2}
                  className="wave-bar"
                  style={{ animationDelay: `${index * 0.11}s` }}
                />
              );
            })}
          </g>

          {/* Lignes de flux, pointillés qui avancent de la voix vers le document. */}
          <path d="M214 250 C 280 250, 300 200, 360 200" stroke="url(#hero-flow)" strokeWidth="1.2" className="flow-dash" />
          <path d="M214 250 C 280 250, 300 300, 360 300" stroke="url(#hero-flow)" strokeWidth="1.2" className="flow-dash" style={{ animationDelay: '-3s' }} />
          <path d="M360 200 C 560 200, 760 250, 1000 250" stroke="url(#hero-flow)" strokeWidth="1.2" className="flow-dash" style={{ animationDelay: '-1.5s' }} />
          <path d="M360 300 C 560 300, 760 250, 1000 250" stroke="url(#hero-flow)" strokeWidth="1.2" className="flow-dash" style={{ animationDelay: '-4.5s' }} />
          <path d="M1000 250 C 1040 250, 1050 214, 1090 214" stroke="url(#hero-flow)" strokeWidth="1.2" className="flow-dash" style={{ animationDelay: '-2.2s' }} />
          <path d="M1000 250 C 1040 250, 1050 286, 1090 286" stroke="url(#hero-flow)" strokeWidth="1.2" className="flow-dash" style={{ animationDelay: '-5.6s' }} />

          {/* Nœuds d'information. */}
          {[
            [360, 200],
            [360, 300],
            [1000, 250],
          ].map(([x, y], index) => (
            <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
              <circle r="14" fill="#2F52E8" opacity="0.06" />
              <circle r="4" fill="#2F52E8" opacity="0.5" className="pulse-dot" style={{ animationDelay: `${index * 0.7}s` }} />
            </g>
          ))}

          {/* Document structuré, à droite : quelques lignes qui deviennent un devis. */}
          <g transform="translate(1090 166)" opacity="0.3">
            <rect x="0" y="0" width="150" height="176" rx="10" fill="#fff" stroke="#C8D2FF" />
            <rect x="14" y="16" width="70" height="6" rx="3" fill="#2F52E8" opacity="0.55" />
            <rect x="14" y="34" width="122" height="4" rx="2" fill="#C8D2FF" />
            <rect x="14" y="48" width="98" height="4" rx="2" fill="#C8D2FF" />
            <rect x="14" y="62" width="110" height="4" rx="2" fill="#C8D2FF" />
            <rect x="14" y="94" width="122" height="4" rx="2" fill="#C8D2FF" />
            <rect x="14" y="108" width="80" height="4" rx="2" fill="#C8D2FF" />
            <rect x="88" y="140" width="48" height="8" rx="4" fill="#2F52E8" opacity="0.6" />
          </g>
        </g>
      </svg>
    </div>
  );
}

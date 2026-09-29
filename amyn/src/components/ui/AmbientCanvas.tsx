"use client";

import { useEffect, useRef } from "react";

/**
 * « Système vivant » — la signature du fond AMYN.
 *
 * Derrière le contenu, sur une seule toile :
 *   - des silhouettes d'interfaces (fenêtre de site, téléphone, tuile de
 *     tableau de bord), à peine tracées, qui flottent à plusieurs
 *     profondeurs ;
 *   - des flux dorés qui les relient, parcourus par des impulsions de
 *     lumière : une demande qui passe du site à l'application puis à
 *     l'outil, avec un léger éclat à l'arrivée ;
 *   - une poussière champagne en suspension, plus vive près du curseur.
 * La lumière elle-même reste en CSS, fixe (voir `.ambient-lights`) : la
 * repeindre à chaque image coûterait tout l'écran.
 * Tout glisse en parallaxe avec la lecture, plus lentement que le texte.
 *
 * Coût maîtrisé :
 *   - 30 images par seconde au plus (24 sur téléphone), résolution
 *     plafonnée (1× sur téléphone) ;
 *   - arrêt quand l'onglet est caché ;
 *   - qualité adaptative : si le dessin d'une image dépasse son budget,
 *     la poussière diminue, puis l'animation se fige ;
 *   - mouvement réduit demandé : une seule image fixe, sans impulsion.
 */

type Rect = { x: number; y: number; w: number; h: number };
type Panel = { kind: "browser" | "phone" | "card"; r: Rect };
type Flow = { a: [number, number]; b: [number, number]; c1: [number, number]; c2: [number, number]; offset: number; period: number };
type Mote = { x: number; y: number; d: number; s: number; vx: number; vy: number; tw: number; a: number };

const GOLD = "198, 167, 106";
const CHAMPAGNE = "236, 214, 168";
const BONE = "242, 238, 230";

/** Vitesse de la couche « interfaces » par rapport au défilement. */
const DEPTH = 0.22;

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function bezier(f: Flow, t: number): [number, number] {
  const u = 1 - t;
  const x = u * u * u * f.a[0] + 3 * u * u * t * f.c1[0] + 3 * u * t * t * f.c2[0] + t * t * t * f.b[0];
  const y = u * u * u * f.a[1] + 3 * u * u * t * f.c1[1] + 3 * u * t * t * f.c2[1] + t * t * t * f.b[1];
  return [x, y];
}

/** Petite lumière douce, dessinée une fois puis réutilisée. */
function sprite(size: number, rgb: string) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, `rgba(${rgb}, 1)`);
  grad.addColorStop(0.25, `rgba(${rgb}, 0.45)`);
  grad.addColorStop(1, `rgba(${rgb}, 0)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return c;
}

export function AmbientCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const dot = sprite(64, CHAMPAGNE);

    let w = 0;
    let h = 0;
    let dpr = 1;
    let mobile = false;
    let tile = 1000;
    let panels: Panel[] = [];
    let flows: Flow[] = [];
    let motes: Mote[] = [];
    let quality = 1; // 1 plein, 0.5 allégé, 0 figé
    let pointer: { x: number; y: number } | null = null;

    /* Composition d'une « tuile » de fond, répétée verticalement. Les
       tuiles impaires sont en miroir pour éviter l'effet de motif. */
    function compose() {
      mobile = w < 700;
      tile = Math.max(h * 1.7, 900);
      const bw = mobile ? w * 0.78 : Math.min(w * 0.4, 600);
      const pw = mobile ? Math.max(w * 0.26, 92) : clamp(w * 0.1, 96, 150);
      const cw = mobile ? w * 0.46 : Math.min(w * 0.19, 270);
      panels = [
        { kind: "browser", r: { x: mobile ? w * 0.56 : w * 0.64, y: tile * 0.08, w: bw, h: bw * 0.62 } },
        { kind: "phone", r: { x: mobile ? -pw * 0.34 : -pw * 0.42, y: tile * 0.5, w: pw, h: pw * 2.05 } },
        { kind: "card", r: { x: mobile ? w * 0.6 : w * 0.7, y: tile * 0.74, w: cw, h: cw * 0.56 } },
      ];
      const [b, p, c] = panels;
      const bl: [number, number] = [b.r.x, b.r.y + b.r.h * 0.55];
      const pr: [number, number] = [p.r.x + p.r.w, p.r.y + p.r.h * 0.22];
      const pr2: [number, number] = [p.r.x + p.r.w, p.r.y + p.r.h * 0.72];
      const cl: [number, number] = [c.r.x, c.r.y + c.r.h * 0.5];
      flows = [
        { a: bl, b: pr, c1: [bl[0] - w * 0.18, bl[1] + tile * 0.04], c2: [pr[0] + w * 0.22, pr[1] - tile * 0.2], offset: 0, period: 9 },
        { a: pr2, b: cl, c1: [pr2[0] + w * 0.25, pr2[1] + tile * 0.02], c2: [cl[0] - w * 0.2, cl[1] - tile * 0.06], offset: 4.5, period: 8 },
      ];
      const count = Math.round((mobile ? 22 : 60) * (quality === 0.5 ? 0.5 : 1));
      motes = Array.from({ length: count }, () => {
        const d = 0.25 + Math.random() * 0.75;
        /* Moins de poussière au centre, où se lit le texte. */
        let x = Math.random();
        if (Math.random() < 0.55) x = x < 0.5 ? x * 0.5 : 0.75 + (x - 0.5) * 0.5;
        return {
          x: x * w,
          y: Math.random() * h,
          d,
          s: (0.8 + Math.random() * 1.6) * d,
          vx: (Math.random() - 0.5) * 3,
          vy: -(1.5 + Math.random() * 4) * d,
          tw: Math.random() * Math.PI * 2,
          a: (0.12 + Math.random() * 0.24) * d,
        };
      });
    }

    function resize() {
      const nw = window.innerWidth;
      const nh = window.innerHeight;
      /* Sur téléphone, la barre d'adresse change la hauteur en défilant :
         on ne recompose que si la largeur change ou si l'écart est net. */
      if (nw === w && Math.abs(nh - h) < 140) return;
      w = nw;
      h = nh;
      dpr = Math.min(window.devicePixelRatio || 1, w < 700 ? 1 : 1.25);
      canvas!.width = Math.round(w * dpr);
      canvas!.height = Math.round(h * dpr);
      compose();
      if (calm || quality === 0) draw(performance.now() / 1000, true);
    }

    function roundRect(r: Rect, radius: number) {
      ctx!.beginPath();
      if ("roundRect" in ctx!) ctx!.roundRect(r.x, r.y, r.w, r.h, radius);
      else ctx!.rect(r.x, r.y, r.w, r.h);
    }

    function drawPanel(p: Panel, alpha: number) {
      const { r } = p;
      const c = ctx!;
      /* Sur téléphone, le texte occupe toute la largeur : de simples
         contours, sans lignes de contenu. */
      const outline = mobile;
      const rad = p.kind === "phone" ? r.w * 0.16 : 14;
      /* Verre : un voile qui s'éteint vers le bas. */
      const fill = c.createLinearGradient(0, r.y, 0, r.y + r.h);
      fill.addColorStop(0, `rgba(${BONE}, ${0.035 * alpha})`);
      fill.addColorStop(1, `rgba(${BONE}, 0)`);
      roundRect(r, rad);
      c.fillStyle = fill;
      c.fill();
      /* Arête : plus nette en haut, comme éclairée d'en haut. */
      const edge = c.createLinearGradient(0, r.y, 0, r.y + r.h);
      edge.addColorStop(0, `rgba(${BONE}, ${0.13 * alpha})`);
      edge.addColorStop(0.6, `rgba(${BONE}, ${0.04 * alpha})`);
      edge.addColorStop(1, `rgba(${BONE}, 0)`);
      c.strokeStyle = edge;
      c.lineWidth = 1;
      c.stroke();
      if (outline) return;

      c.fillStyle = `rgba(${BONE}, ${0.036 * alpha})`;
      if (p.kind === "browser") {
        c.fillRect(r.x, r.y + 30, r.w, 1);
        for (let i = 0; i < 3; i++) {
          c.beginPath();
          c.arc(r.x + 18 + i * 12, r.y + 15, 2.6, 0, Math.PI * 2);
          c.fill();
        }
        const lines = [0.46, 0.32, 0.38];
        lines.forEach((l, i) => c.fillRect(r.x + 26, r.y + 64 + i * 20, r.w * l, 6));
        c.fillStyle = `rgba(${GOLD}, ${0.08 * alpha})`;
        c.fillRect(r.x + 26, r.y + 136, r.w * 0.16, 16);
      } else if (p.kind === "phone") {
        c.fillRect(r.x + r.w * 0.36, r.y + r.w * 0.09, r.w * 0.28, 5);
        [0.62, 0.44, 0.52].forEach((l, i) => c.fillRect(r.x + r.w * 0.14, r.y + r.h * (0.32 + i * 0.09), r.w * l, 5));
        c.fillStyle = `rgba(${GOLD}, ${0.08 * alpha})`;
        roundRect({ x: r.x + r.w * 0.14, y: r.y + r.h * 0.78, w: r.w * 0.72, h: r.h * 0.07 }, 8);
        c.fill();
      } else {
        const bars = [0.35, 0.6, 0.45, 0.8, 0.55];
        const bw = r.w / (bars.length * 2 + 1);
        bars.forEach((v, i) => {
          c.fillStyle = `rgba(${i === 3 ? GOLD : BONE}, ${(i === 3 ? 0.1 : 0.045) * alpha})`;
          c.fillRect(r.x + bw * (1 + i * 2), r.y + r.h * (0.86 - v * 0.6), bw, r.h * v * 0.6);
        });
      }
    }

    function draw(time: number, still = false) {
      const c = ctx!;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.clearRect(0, 0, w, h);
      const scroll = window.scrollY;

      /* Interfaces et flux, en tuiles répétées : ils glissent ensemble,
         plus lentement que le texte (parallaxe). */
      /* Le hero a sa propre scène (HeroScene) : silhouettes et flux ne s'y
         superposent pas, ils apparaissent une fois le hero quitté. */
      const hero = document.querySelector("[data-hero-scene]");
      const heroFade = hero ? clamp((scroll - h * 0.35) / (h * 0.55), 0, 1) : 1;
      const fade = (mobile ? 0.55 : 1) * heroFade;
      const shift = (scroll * DEPTH) % tile;
      const first = Math.floor((scroll * DEPTH) / tile);
      for (let k = -1; k <= Math.ceil(h / tile) + 1 && fade > 0.01; k++) {
        const tileIndex = first + k;
        const mirror = Math.abs(tileIndex) % 2 === 1;
        const oy = k * tile - shift;
        c.save();
        if (mirror) {
          c.translate(w, oy);
          c.scale(-1, 1);
        } else c.translate(0, oy);

        for (const p of panels) {
          const top = oy + p.r.y;
          if (top > h + 40 || top + p.r.h < -40) continue;
          drawPanel(p, fade);
        }

        flows.forEach((f, i) => {
          const minY = Math.min(f.a[1], f.b[1], f.c1[1], f.c2[1]) + oy;
          const maxY = Math.max(f.a[1], f.b[1], f.c1[1], f.c2[1]) + oy;
          if (minY > h + 40 || maxY < -40) return;
          /* Le trait du flux. */
          c.beginPath();
          c.moveTo(f.a[0], f.a[1]);
          c.bezierCurveTo(f.c1[0], f.c1[1], f.c2[0], f.c2[1], f.b[0], f.b[1]);
          const line = c.createLinearGradient(f.a[0], f.a[1], f.b[0], f.b[1]);
          line.addColorStop(0, `rgba(${GOLD}, 0.02)`);
          line.addColorStop(0.5, `rgba(${GOLD}, ${0.16 * fade})`);
          line.addColorStop(1, `rgba(${GOLD}, 0.03)`);
          c.strokeStyle = line;
          c.lineWidth = 1;
          c.stroke();
          /* Les nœuds, posés sur les interfaces. */
          for (const n of [f.a, f.b]) {
            c.fillStyle = `rgba(${CHAMPAGNE}, ${0.4 * fade})`;
            c.beginPath();
            c.arc(n[0], n[1], 2, 0, Math.PI * 2);
            c.fill();
          }
          if (still) return;
          /* L'impulsion : elle parcourt le flux, puis s'efface dans le nœud. */
          const cycle = (((time + f.offset + tileIndex * 2.3 + i) % f.period) + f.period) % f.period / f.period;
          const travel = 0.62;
          if (cycle < travel) {
            const t = ease(cycle / travel);
            /* Traînée continue, comme une comète. */
            const [hx] = bezier(f, t);
            const sx = (mirror ? w - hx : hx) / w;
            /* Plus discrète en traversant la colonne de lecture. */
            const reading = 1 - 0.6 * Math.exp(-((sx - 0.32) ** 2) / 0.05);
            for (let s = 22; s >= 0; s--) {
              const [x, y] = bezier(f, clamp(t - s * 0.0055, 0, 1));
              const size = s === 0 ? 20 : 8 - s * 0.26;
              c.globalAlpha = Math.pow(1 - s / 23, 1.6) * 0.4 * fade * reading;
              c.drawImage(dot, x - size / 2, y - size / 2, size, size);
            }
            c.globalAlpha = 1;
          } else if (cycle < travel + 0.18) {
            /* Arrivée : un anneau s'ouvre et s'éteint. */
            const q = (cycle - travel) / 0.18;
            c.strokeStyle = `rgba(${CHAMPAGNE}, ${(1 - q) * 0.4 * fade})`;
            c.beginPath();
            c.arc(f.b[0], f.b[1], 3 + q * 22, 0, Math.PI * 2);
            c.stroke();
          }
        });
        c.restore();
      }

      /* Poussière de lumière. */
      for (const m of motes) {
        const y = (((m.y - scroll * 0.08 * m.d) % h) + h) % h;
        let a = m.a * (still ? 0.8 : 0.65 + 0.35 * Math.sin(time * 0.8 + m.tw));
        let x = m.x;
        if (pointer) {
          const dx = x - pointer.x;
          const dy = y - pointer.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 200) {
            const k = 1 - dist / 200;
            a += k * 0.28;
            x += (dx / (dist || 1)) * k * 10;
          }
        }
        const size = m.s * 7;
        c.globalAlpha = clamp(a, 0, 0.5);
        c.drawImage(dot, x - size / 2, y - size / 2, size, size);
      }
      c.globalAlpha = 1;
    }

    let raf = 0;
    let last = 0;
    let prev = 0;
    let slow = 0;
    let frames = 0;

    function step(now: number) {
      raf = requestAnimationFrame(step);
      if (now - last < 1000 / (mobile ? 24 : 30)) return;
      const dt = Math.min((now - (prev || now)) / 1000, 0.1);
      prev = now;
      last = now;
      for (const m of motes) {
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        if (m.y < -10) m.y += h + 20;
        if (m.x < -10) m.x += w + 20;
        if (m.x > w + 10) m.x -= w + 20;
      }
      const t0 = performance.now();
      draw(now / 1000);
      const cost = performance.now() - t0;
      /* Qualité adaptative, sur les premières secondes seulement. */
      if (frames < 150) {
        frames++;
        if (cost > 9) slow++;
        if (frames === 60 && slow > 30 && quality === 1) {
          quality = 0.5;
          compose();
          slow = 0;
        } else if (frames === 150 && slow > 45) {
          quality = 0;
          cancelAnimationFrame(raf);
          draw(now / 1000, true);
        }
      }
    }

    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden && !calm && quality > 0) raf = requestAnimationFrame(step);
    };
    const onPointer = (e: PointerEvent) => {
      if (e.pointerType === "mouse") pointer = { x: e.clientX, y: e.clientY };
    };
    const onLeave = () => (pointer = null);
    /* Figé : on redessine seulement au défilement, pour garder la parallaxe. */
    let pending = 0;
    const onScroll = () => {
      if (!(calm || quality === 0) || pending) return;
      pending = requestAnimationFrame(() => {
        pending = 0;
        if (!calm) draw(performance.now() / 1000, true);
      });
    };
    let resizeTimer = 0;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(resize, 150);
    };

    resize();
    canvas.dataset.ready = "true";
    if (calm) draw(0, true);
    else raf = requestAnimationFrame(step);

    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    if (fine && !calm) {
      window.addEventListener("pointermove", onPointer, { passive: true });
      document.documentElement.addEventListener("pointerleave", onLeave);
    }
    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(pending);
      window.clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointermove", onPointer);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return <canvas ref={ref} aria-hidden className="ambient-canvas" />;
}

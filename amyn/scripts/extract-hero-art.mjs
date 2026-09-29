/**
 * Extrait les deux calques photographiques du hero à partir de l'image de
 * référence fournie par AMYN (design/hero-reference.webp) :
 *
 *   public/hero/planet.webp — la planète et son liseré doré, avec la
 *     transparence : le corps de la planète reste opaque (il masque ce qui
 *     passe derrière), l'espace autour devient transparent selon sa
 *     luminosité (étoiles et halo conservés) ;
 *   public/hero/relief.webp — les reliefs de gauche, fondus sur les bords.
 *
 * Les éléments incrustés dans l'image (ligne verticale, label, points) sont
 * effacés : le site dessine les siens, animés et traduits.
 *
 *   node scripts/extract-hero-art.mjs
 */
import sharp from "sharp";

const SRC = "design/hero-reference.webp";
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (e0, e1, x) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};

async function region(left, top, width, height) {
  const { data, info } = await sharp(SRC)
    .extract({ left, top, width, height })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
}

/* Remplace une bande verticale par une interpolation de ses deux bords. */
function eraseColumn(img, x0, x1, y0, y1) {
  const { data, w } = img;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const t = (x - x0 + 1) / (x1 - x0 + 2);
      for (let c = 0; c < 3; c++) {
        const a = data[(y * w + (x0 - 2)) * 4 + c];
        const b = data[(y * w + (x1 + 2)) * 4 + c];
        data[(y * w + x) * 4 + c] = Math.round(a * (1 - t) + b * t);
      }
    }
  }
}

/* Recopie un rectangle depuis une zone voisine (texte incrusté, points). */
function patch(img, x, y, w, h, fromX, fromY) {
  const { data, w: W } = img;
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const s = ((fromY + j) * W + (fromX + i)) * 4;
      const d = ((y + j) * W + (x + i)) * 4;
      for (let c = 0; c < 3; c++) data[d + c] = data[s + c];
    }
  }
}

async function planet() {
  const img = await region(980, 0, 692, 540);
  /* Ligne verticale « ANALYTICS », ses points et son label. */
  eraseColumn(img, 461, 469, 60, 540);
  patch(img, 466, 170, 70, 18, 466, 130);
  patch(img, 480, 150, 140, 26, 480, 110);
  patch(img, 455, 318, 22, 20, 455, 290);
  patch(img, 448, 166, 26, 24, 448, 138);

  /* Corps de la planète : cercle ajusté sur le liseré (repère du recadrage). */
  const cx = 700;
  const cy = 612;
  const r = 704;
  const { data, w, h } = img;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const [R, G, B] = [data[i], data[i + 1], data[i + 2]];
      const inside = smooth(r + 2, r - 3, Math.hypot(x - cx, y - cy));
      const lum = Math.max(R, G, B);
      const glow = clamp((lum - 5) / 70, 0, 1);
      let a = Math.max(inside, glow);
      /* Bords du recadrage fondus : à gauche, en bas, et un peu en haut
         (la planète descend sous l'en-tête du site). */
      a *= smooth(0, 150, x) * smooth(h, h - 150, y) * smooth(0, 110, y);
      if (a > 0 && inside < 1) {
        /* Hors de la planète : couleur « dé-multipliée » pour garder l'éclat. */
        const k = Math.max(glow, 0.001);
        data[i] = clamp(Math.round(R / Math.max(k, inside || k)), 0, 255);
        data[i + 1] = clamp(Math.round(G / Math.max(k, inside || k)), 0, 255);
        data[i + 2] = clamp(Math.round(B / Math.max(k, inside || k)), 0, 255);
      }
      data[i + 3] = Math.round(a * 255);
    }
  }
  await sharp(data, { raw: { width: w, height: h, channels: 4 } })
    .webp({ quality: 84, alphaQuality: 90, effort: 6 })
    .toFile("public/hero/planet.webp");
}

async function relief() {
  const img = await region(0, 440, 700, 290);
  /* Ligne verticale « AUTOMATION ». */
  eraseColumn(img, 171, 179, 0, 290);
  const { data, w, h } = img;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      /* Le ciel se fond dans le fond du site ; la roche reste. */
      let a = smooth(0, 110, y) * smooth(w, w - 230, x) * smooth(h, h - 120, y);
      /* À droite, le ciel porte encore un trait d'orbite : effacé. */
      if (x > 360) a *= smooth(70, 130, y);
      data[i + 3] = Math.round(a * 255);
    }
  }
  await sharp(data, { raw: { width: w, height: h, channels: 4 } })
    .webp({ quality: 82, alphaQuality: 90, effort: 6 })
    .toFile("public/hero/relief.webp");
}

await planet();
await relief();
console.log("public/hero/planet.webp, public/hero/relief.webp");

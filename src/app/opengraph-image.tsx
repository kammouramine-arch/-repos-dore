import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = "DEVISIA — L'IA qui transforme votre travail en devis";

/** Image Open Graph par défaut, sobre et lisible en petit format. */
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#ffffff',
          padding: 72,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div
            style={{
              width: 56,
              height: 56,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#2547e0',
              color: '#ffffff',
              borderRadius: 16,
              fontSize: 34,
              fontWeight: 700,
            }}
          >
            D
          </div>
          <div style={{ fontSize: 30, fontWeight: 600, color: '#0a0e14', letterSpacing: '-0.03em' }}>
            DEVISIA
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div
            style={{
              fontSize: 66,
              fontWeight: 700,
              color: '#0a0e14',
              letterSpacing: '-0.04em',
              lineHeight: 1.05,
              maxWidth: 900,
            }}
          >
            L’IA qui transforme votre travail en devis.
          </div>
          <div style={{ fontSize: 28, color: '#5b6675', maxWidth: 820 }}>
            Parlez, ajoutez vos photos, envoyez votre devis professionnel en quelques secondes.
          </div>
        </div>

        <div style={{ display: 'flex', fontSize: 22, color: '#8a93a1' }}>
          Devis · Relances · Chiffre d’affaires récupéré
        </div>
      </div>
    ),
    { ...size },
  );
}

import { ImageResponse } from 'next/og';

export const size = { width: 64, height: 64 };
export const contentType = 'image/png';

/** Favicon : monogramme DEVISIA sur fond de marque. */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#2547e0',
          color: '#ffffff',
          fontSize: 40,
          fontWeight: 700,
          letterSpacing: '-0.04em',
          borderRadius: 14,
        }}
      >
        D
      </div>
    ),
    { ...size },
  );
}

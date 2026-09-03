import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'DEVISIA — Devis par IA',
    short_name: 'DEVISIA',
    description:
      "Créez, envoyez et relancez vos devis depuis le chantier. L'IA qui transforme votre travail en devis.",
    start_url: '/app',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#2547e0',
    lang: 'fr',
    categories: ['business', 'productivity'],
    icons: [
      { src: '/icon', sizes: '64x64', type: 'image/png', purpose: 'any' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png', purpose: 'any' },
    ],
    shortcuts: [
      { name: 'Nouveau devis', url: '/app/devis/nouveau' },
      { name: 'Relances', url: '/app/relances' },
    ],
  };
}

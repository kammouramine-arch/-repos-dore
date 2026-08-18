import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { ToastProvider } from '@/components/ui/toast';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const APP_URL = process.env.APP_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "DEVISIA — L'IA qui transforme votre travail en devis",
    template: '%s — DEVISIA',
  },
  description:
    "Parlez, ajoutez vos photos et laissez DEVISIA préparer votre devis professionnel en quelques secondes. Le logiciel de devis des artisans et petites entreprises de services.",
  applicationName: 'DEVISIA',
  keywords: [
    'logiciel devis artisan',
    'devis IA',
    'devis vocal',
    'relance devis',
    'gestion clients artisan',
    'devis plombier',
    'devis électricien',
  ],
  authors: [{ name: 'DEVISIA' }],
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: APP_URL,
    siteName: 'DEVISIA',
    title: "DEVISIA — L'IA qui transforme votre travail en devis",
    description:
      'Ne perdez plus un client faute de temps. Créez, envoyez et relancez vos devis depuis le chantier.',
  },
  twitter: {
    card: 'summary_large_image',
    title: "DEVISIA — L'IA qui transforme votre travail en devis",
    description: 'Ne perdez plus un client faute de temps.',
  },
  robots: { index: true, follow: true },
  formatDetection: { telephone: true },
};

export const viewport: Viewport = {
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

/**
 * La coque reste statique : la langue par défaut est le français et l'espace
 * applicatif ajuste l'attribut `lang` selon la préférence de l'utilisateur.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={inter.variable}>
      <body className="min-h-dvh bg-canvas antialiased">
        <a
          href="#contenu"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-[10px] focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:text-white"
        >
          Aller au contenu principal
        </a>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}

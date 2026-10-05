import type { NextConfig } from "next";

/**
 * En-têtes de sécurité appliqués à toutes les réponses.
 *
 * La politique de contenu reste volontairement limitée aux directives qui
 * ne demandent pas de nonce (cadres, formulaires, plugins, base) : le site
 * reste entièrement statique, sans script tiers à autoriser.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  /* Deux racines (une par langue) : une adresse inconnue reçoit une page
     404 bilingue (app/global-not-found.tsx). */
  experimental: { globalNotFound: true },
  /* Écrans et photos servis en AVIF (WebP en repli), à la bonne taille.
     Les captures d'interface gardent une qualité plus haute : du texte y
     est lisible. */
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [70, 82],
  },
  /* Un seul parcours : l'ancienne page de contact mène au premier aperçu
     (les paramètres de l'adresse, comme ?service=, sont conservés).
     Le français n'a pas de préfixe : /fr renvoie aux adresses sans préfixe,
     pour qu'une même page n'existe jamais à deux adresses. */
  async redirects() {
    return [
      { source: "/contact", destination: "/premier-apercu", permanent: true },
      { source: "/en/contact", destination: "/en/first-look", permanent: true },
      { source: "/fr", destination: "/", permanent: true },
      { source: "/fr/:path*", destination: "/:path*", permanent: true },
    ];
  },
  async headers() {
    /* Revenue Audit privés : ni indexés, ni archivés, et l'adresse (le lien
       privé) n'est jamais transmise comme référent. */
    const auditHeaders = [
      { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive, nosnippet" },
      { key: "Referrer-Policy", value: "no-referrer" },
    ];
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/audit/:slug*", headers: auditHeaders },
      { source: "/en/audit/:slug*", headers: auditHeaders },
    ];
  },
};

export default nextConfig;

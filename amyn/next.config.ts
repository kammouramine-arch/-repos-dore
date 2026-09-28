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
  /* Écrans et photos servis en AVIF (WebP en repli), à la bonne taille.
     Les captures d'interface gardent une qualité plus haute : du texte y
     est lisible. */
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [70, 82],
  },
  /* Un seul parcours : l'ancienne page de contact mène au premier aperçu
     (les paramètres de l'adresse, comme ?service=, sont conservés). */
  async redirects() {
    return [{ source: "/contact", destination: "/premier-apercu", permanent: true }];
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;

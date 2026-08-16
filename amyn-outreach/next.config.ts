import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Masque la pastille flottante de developpement, qui recouvre le pied de page.
  devIndicators: false,
};

export default nextConfig;

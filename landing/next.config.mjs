/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Sitio mayormente estático: la página se genera en build (SSG) y se sirve
  // desde el edge de Vercel. Sin datos dinámicos → 100% prerendered.
  poweredByHeader: false,
  compress: true,
};

export default nextConfig;

# landing

Sitio de marketing de Lumina — primera pieza pública de la visión SaaS v2.
Comunica la propuesta de valor (recorridos virtuales con IA en minutos) y el
call-to-action de acceso.

## Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript**. Deploy en **Vercel**.
- **100% estático**: la página se prerenderiza en build (SSG). Cero JS de cliente
  propio — las animaciones son **CSS scroll-driven** (`view-timeline` / `animation-timeline`).
- **SEO** con las utilities de Next: Metadata API (Open Graph, Twitter, canonical,
  robots), `app/sitemap.ts`, `app/robots.ts`, `app/opengraph-image.tsx` (OG generada
  en build) y JSON-LD (`Organization` / `WebSite` / `SoftwareApplication`).

## Hero scrollytelling

- **Desktop** (≥880px, con `prefers-reduced-motion: no-preference` y soporte de
  scroll-driven animations): el video queda *pinned* (`position: sticky`) y escala
  mientras se hace scroll; 3 textos se revelan intercalados — **izquierda → derecha
  → centro** — secuenciados con `view-timeline` sobre el contenedor del hero.
- **Mobile / fallback** (sin soporte, reduced-motion o crawlers): baseline legible —
  el video es un hero contenido (autoplay, `muted`, `loop`, `playsInline`) y los 3
  textos pasan a secciones apiladas que se revelan suavemente con `view()`. El
  contenido siempre está en el DOM y visible (accesibilidad + SEO).

## Assets

`public/hero.webm` (VP9) + `public/hero.mp4` (fallback H.264, muted, faststart) +
`public/hero-poster.jpg` (poster/LCP). Generados desde el `Hero.mp4` original con ffmpeg.

## Desarrollo

```bash
cd landing
npm install
npm run dev      # http://localhost:3000
npm run build    # build de producción (SSG)
npm start        # servir el build
```

`NEXT_PUBLIC_SITE_URL` configura la URL canónica / sitemap (default `https://lumina.propital.com`).

## Convención de monorepo

Las apps de Lumina viven en carpetas hermanas en la raíz: `lumina/` (backend),
`landing/` (este sitio), `web/` (portal SaaS). Cada app es autónoma con sus
propias dependencias; sin gestor de workspaces por ahora.

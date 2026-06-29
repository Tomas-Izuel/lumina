import type { Metadata } from "next";

export const metadata: Metadata = {
  description:
    "Subí las fotos de una propiedad y Lumina genera un recorrido virtual cinematográfico con IA. Automático, multi-tenant y entregado por API.",
};

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://lumina.propital.com";

// Datos estructurados (JSON-LD) para rich results / SEO.
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#org`,
      name: "Lumina",
      url: SITE_URL,
      description:
        "Servicio que convierte fotos de propiedades en recorridos virtuales generados con IA.",
      parentOrganization: { "@type": "Organization", name: "Propital" },
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "Lumina",
      inLanguage: "es",
      publisher: { "@id": `${SITE_URL}/#org` },
    },
    {
      "@type": "SoftwareApplication",
      name: "Lumina",
      applicationCategory: "MultimediaApplication",
      operatingSystem: "Web (API)",
      offers: { "@type": "Offer", category: "SaaS" },
      description:
        "Generación asíncrona de recorridos virtuales a partir de fotos, con Amazon Bedrock y Luma Ray 2.",
    },
  ],
};

const Spark = () => (
  <svg viewBox="0 0 100 100" aria-hidden="true">
    <defs>
      <linearGradient id="sg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#a78bfa" />
        <stop offset="100%" stopColor="#38bdf8" />
      </linearGradient>
    </defs>
    <path
      d="M50 6 C54 34 66 46 94 50 C66 54 54 66 50 94 C46 66 34 54 6 50 C34 46 46 34 50 6 Z"
      fill="url(#sg)"
    />
  </svg>
);

// Contenido de los 3 textos intercalados.
const BEATS = [
  {
    pos: "left" as const,
    num: "01 — Subí las fotos",
    title: "Cinco fotos. Nada más.",
    body: "Sin filmaciones, sin drones, sin equipos de producción. Con las fotos que ya tenés de la propiedad alcanza para empezar.",
  },
  {
    pos: "right" as const,
    num: "02 — La IA hace la magia",
    title: "Cada ambiente, en movimiento.",
    body: "Amazon Bedrock y Luma Ray 2 interpolan los ambientes y los unen en un recorrido continuo y fluido, como si una cámara navegara la casa.",
  },
  {
    pos: "center" as const,
    num: "03 — Recibí tu recorrido",
    title: "Listo para publicar.",
    body: "Un video entregado por API, multi-tenant y serverless. Pensado para escalar a toda tu cartera de propiedades.",
    cta: true,
  },
];

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="topbar">
        <a className="brand" href="#top" aria-label="Lumina — inicio">
          <Spark />
          <span className="brand-name">Lumina</span>
        </a>
        <a className="btn btn-ghost" href="#contacto">
          Solicitar acceso
        </a>
      </header>

      <main id="top">
        {/* ---------- HERO scrollytelling ---------- */}
        <section className="scrolly" aria-label="Cómo funciona Lumina">
          <div className="stage">
            <video
              className="video"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              poster="/hero-poster.jpg"
            >
              <source src="/hero.webm" type="video/webm" />
              <source src="/hero.mp4" type="video/mp4" />
            </video>
            {/* Bajo prefers-reduced-motion mostramos el poster estático en vez
                del video en loop (WCAG 2.2.2). Decorativo → aria-hidden. */}
            <img
              className="video-fallback"
              src="/hero-poster.jpg"
              alt=""
              aria-hidden="true"
            />
            <div className="scrim" />
            <div className="scrim-tint" />

            {/* Intro */}
            <div className="layer intro">
              <span className="eyebrow">
                <Spark />
                Recorridos virtuales con IA
              </span>
              <h1>
                Tus propiedades,
                <br />
                <span className="grad">en movimiento.</span>
              </h1>
              <p>
                Lumina convierte fotos en recorridos virtuales cinematográficos.
                Automático, en minutos.
              </p>
              <div className="actions">
                <a className="btn btn-primary" href="#contacto">
                  Solicitar acceso
                </a>
                <a className="btn btn-ghost" href="#como-funciona">
                  Ver cómo funciona
                </a>
              </div>
              <div className="scroll-cue" aria-hidden="true">
                <span className="mouse" />
                Scrolleá para ver cómo
              </div>
            </div>

            {/* Beats intercalados (desktop, sobre el video pinned) */}
            {BEATS.map((b) => (
              <div key={b.num} className={`layer beat ${b.pos}`}>
                <BeatContent {...b} />
              </div>
            ))}
          </div>
        </section>

        {/* ---------- Beats en flujo (baseline: mobile + fallback desktop) ---------- */}
        <section className="flow-beats" id="como-funciona">
          {BEATS.map((b) => (
            <div key={b.num} className={`m-beat ${b.pos}`}>
              <BeatContent {...b} />
            </div>
          ))}
        </section>

        {/* ---------- Valor + CTA ---------- */}
        <section className="section">
          <div className="section-inner">
            <h2>Infraestructura de video, lista para tu inmobiliaria</h2>
            <p className="lead">
              Lumina centraliza la generación, el control de uso y la entrega de
              recorridos virtuales en un solo servicio.
            </p>

            <div className="feature-grid">
              <Feature icon="🎬" title="IA generativa">
                Amazon Bedrock · Luma Ray 2. Calidad cinematográfica con backend
                de modelo intercambiable.
              </Feature>
              <Feature icon="⚡" title="Asíncrono y serverless">
                Respondemos al instante con un identificador y avisamos por
                webhook firmado cuando el video está listo.
              </Feature>
              <Feature icon="🏢" title="Multi-tenant">
                Aislamiento por cuenta, cuotas y créditos. Cada app del grupo
                consume con su propia API key.
              </Feature>
              <Feature icon="🔒" title="Seguro por diseño">
                API key por tenant, RLS en base de datos y entrega por links
                firmados de vida corta.
              </Feature>
            </div>

            <div className="cta-final" id="contacto">
              <h2>¿Listo para mostrar tus propiedades como nunca?</h2>
              <p className="lead">
                Sumate a Propital, Propirent y Orkezto generando recorridos con
                Lumina.
              </p>
              <a className="btn btn-primary" href="mailto:hola@propital.com?subject=Quiero%20acceso%20a%20Lumina">
                Solicitar acceso
              </a>
            </div>
          </div>
        </section>

        <footer>
          <a className="brand" href="#top">
            <Spark />
            <span className="brand-name">Lumina</span>
          </a>
          <div className="links">
            <a href="#como-funciona">Cómo funciona</a>
            <a href="#contacto">Acceso</a>
            <a href="https://propital.com" rel="noopener">
              Propital
            </a>
          </div>
          <span>© {new Date().getFullYear()} Propital · Lumina</span>
        </footer>
      </main>
    </>
  );
}

function BeatContent({
  num,
  title,
  body,
  cta,
}: {
  num: string;
  title: string;
  body: string;
  cta?: boolean;
}) {
  return (
    <>
      <span className="num">{num}</span>
      <h2>{title}</h2>
      <p>{body}</p>
      {cta && (
        <div className="actions">
          <a className="btn btn-primary" href="#contacto">
            Empezar
          </a>
        </div>
      )}
    </>
  );
}

function Feature({
  icon,
  title,
  children,
}: {
  icon: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="feature">
      <div className="ic" aria-hidden="true">
        {icon}
      </div>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}

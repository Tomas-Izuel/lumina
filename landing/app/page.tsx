import LandingEffects from "./LandingEffects";
import Navbar from "./Navbar";
import UsageToggle from "./UsageToggle";
import Waitlist from "./Waitlist";
import Hero from "./sections/Hero";
import Productos from "./sections/Productos";
import BeamFlow from "./sections/BeamFlow";
import Sobre from "./sections/Sobre";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Lumina",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description:
    "Kit de IA para real estate: estimá el valor de venta y arriendo de una propiedad, convertí fotos en un tour virtual en video y —pronto— recorré su modelo 3D. Por API o desde la web.",
  featureList: [
    "Estimador de valor de venta y arriendo",
    "Tour virtual en video generado con IA",
    "Modelo 3D recorrible (próximamente)",
  ],
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
};

export default function Page() {
  return (
    <section
      data-screen-label="Lumina landing"
      style={{
        position: "relative",
        overflow: "hidden",
        background:
          "linear-gradient(168deg,#efeaf7 0%,#eaecfa 40%,#f2ebf1 72%,#eeecf9 100%)",
      }}
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* fondo: puntos + textura de ruido + blobs animados */}
      <div aria-hidden style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(150,134,182,0.05) 1px,transparent 1.5px)", backgroundSize: "23px 23px", pointerEvents: "none", zIndex: 0 }} />

      {/* glow + grid del hero: full-bleed, detrás del contenedor (bajo el nav).
          El glow se disuelve hacia abajo (mask lineal) para fusionarse con la
          sección siguiente sin corte visible. */}
      <div aria-hidden className="hero-bg" style={{ position: "absolute", top: 0, left: 0, right: 0, height: 980, pointerEvents: "none", zIndex: 0, background: "radial-gradient(1150px 540px at 12% 6%, rgba(203,189,233,0.62), transparent 58%),radial-gradient(960px 540px at 92% 12%, rgba(184,196,238,0.55), transparent 60%),radial-gradient(820px 560px at 55% 74%, rgba(241,218,228,0.55), transparent 64%)", WebkitMaskImage: "linear-gradient(to bottom, #000 0%, #000 46%, transparent 100%)", maskImage: "linear-gradient(to bottom, #000 0%, #000 46%, transparent 100%)" }} />
      <div aria-hidden className="hero-bg" style={{ position: "absolute", top: 0, left: 0, right: 0, height: 860, pointerEvents: "none", zIndex: 0, backgroundImage: "linear-gradient(rgba(154,131,191,0.07) 1px,transparent 1px),linear-gradient(90deg,rgba(154,131,191,0.07) 1px,transparent 1px)", backgroundSize: "44px 44px", WebkitMaskImage: "radial-gradient(ellipse 78% 68% at 50% 40%,#000 10%,transparent 74%)", maskImage: "radial-gradient(ellipse 78% 68% at 50% 40%,#000 10%,transparent 74%)", animation: "lumGrid 16s linear infinite" }} />
      <div aria-hidden style={{ position: "absolute", inset: 0, background: "url(/noise.png) repeat", backgroundSize: "200px 200px", opacity: 0.55, mixBlendMode: "soft-light", pointerEvents: "none", zIndex: 1 }} />
      <div aria-hidden style={{ position: "absolute", top: -180, right: -140, width: 660, height: 660, borderRadius: "50%", background: "radial-gradient(circle at 45% 45%, rgba(184,172,216,0.3), rgba(184,172,216,0) 70%)", filter: "blur(30px)", animation: "lumBlob 22s ease-in-out infinite", pointerEvents: "none", zIndex: 0 }} />
      <div aria-hidden style={{ position: "absolute", top: 760, left: -160, width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle at 50% 50%, rgba(192,202,234,0.24), rgba(192,202,234,0) 70%)", filter: "blur(30px)", animation: "lumBlob2 26s ease-in-out infinite", pointerEvents: "none", zIndex: 0 }} />
      <div aria-hidden style={{ position: "absolute", top: 2100, left: "2%", width: 560, height: 560, borderRadius: "50%", background: "radial-gradient(circle at 50% 50%, rgba(238,219,226,0.32), rgba(238,219,226,0) 70%)", filter: "blur(28px)", animation: "lumBlob 28s ease-in-out infinite", pointerEvents: "none", zIndex: 0 }} />
      <div aria-hidden style={{ position: "absolute", top: 3200, right: "4%", width: 520, height: 520, borderRadius: "50%", background: "radial-gradient(circle at 50% 50%, rgba(184,172,216,0.2), rgba(184,172,216,0) 70%)", filter: "blur(28px)", animation: "lumBlob2 26s ease-in-out infinite", pointerEvents: "none", zIndex: 0 }} />

      <Navbar />

      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "96px 34px 0", position: "relative", zIndex: 10 }}>
        <Hero />
      </div>

      <Productos />
      <BeamFlow />

      {/* DOS FORMAS DE USARLO */}
      <div id="usar" style={{ maxWidth: 1120, margin: "0 auto", padding: "72px 34px", position: "relative", zIndex: 10 }}>
        <div data-reveal style={{ textAlign: "center", maxWidth: 640, margin: "0 auto 30px" }}>
          <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9a90ad" }}>Dos formas de usarlo</span>
          <h2 className="font-serif sec-h2" style={{ fontWeight: 400, fontSize: 46, lineHeight: 1.04, letterSpacing: "-0.018em", margin: "14px 0", color: "#241f30" }}>Una plataforma. Dos formas de usarla.</h2>
        </div>
        <UsageToggle />
      </div>

      <Sobre />

      {/* WAITLIST + FOOTER */}
      <div id="wl" style={{ maxWidth: 1120, margin: "0 auto", padding: "36px 34px 96px", position: "relative", zIndex: 10 }}>
        <div data-reveal style={{ position: "relative", textAlign: "center", padding: "64px 32px", borderRadius: 28, overflow: "hidden", background: "rgba(255,255,255,0.5)", backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)", border: "1px solid rgba(255,255,255,0.75)", boxShadow: "0 34px 80px -36px rgba(80,60,120,0.5)" }}>
          <div aria-hidden style={{ position: "absolute", top: -120, left: "50%", transform: "translateX(-50%)", width: 560, height: 300, background: "radial-gradient(ellipse at center,rgba(210,192,232,0.34),rgba(210,192,232,0) 70%)", pointerEvents: "none" }} />
          <div style={{ position: "relative", zIndex: 2, maxWidth: 560, margin: "0 auto" }}>
            <h2 className="font-serif sec-h2" style={{ fontWeight: 400, fontSize: 46, lineHeight: 1.04, letterSpacing: "-0.018em", margin: "0 0 16px", color: "#241f30" }}>Sé de los primeros en usar Lumina.</h2>
            <p style={{ fontSize: 17, lineHeight: 1.55, color: "#5a5369", margin: "0 0 30px" }}>Dejá tu email y te damos acceso al estimador, más el aviso apenas abramos video y 3D. Plazas limitadas para el primer grupo de inmobiliarias.</p>
            <Waitlist />
            <div style={{ fontSize: 13, color: "#9a90ad", marginTop: 16 }}>Sin spam. Solo el aviso de lanzamiento.</div>
          </div>
        </div>

        <footer style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginTop: 44, paddingTop: 28, borderTop: "1px solid rgba(120,90,160,0.14)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 24, height: 24, borderRadius: 7, background: "linear-gradient(135deg,#ccbde9,#efdde5)", position: "relative" }}>
              <div style={{ position: "absolute", inset: 6, borderRadius: "50%", background: "rgba(255,255,255,0.92)" }} />
            </div>
            <span style={{ fontSize: 16, fontWeight: 600, color: "#2a2433" }}>Lumina</span>
            <span style={{ fontSize: 13, color: "#9a90ad", marginLeft: 6 }}>IA para real estate</span>
          </div>
          <div style={{ fontSize: 13, color: "#9a90ad" }}>© 2026 Lumina · Estimación · Video · 3D</div>
        </footer>
      </div>

      <LandingEffects />
    </section>
  );
}

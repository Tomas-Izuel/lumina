import LandingEffects from "./LandingEffects";
import UsageToggle from "./UsageToggle";
import Waitlist from "./Waitlist";
import Hero from "./sections/Hero";
import Bento from "./sections/Bento";
import BeamFlow from "./sections/BeamFlow";
import Demo from "./sections/Demo";
import Sobre from "./sections/Sobre";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Lumina",
  applicationCategory: "MultimediaApplication",
  operatingSystem: "Web",
  description:
    "Lumina ordena las fotos de tu propiedad con IA y genera un tour virtual en video profesional, en minutos. Por API o desde la web.",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
};

const NAV_LINKS = [
  { href: "#como", label: "Cómo funciona" },
  { href: "#flujo", label: "El flujo" },
  { href: "#usar", label: "API & Web" },
  { href: "#sobre", label: "Lumina" },
];

export default function Page() {
  return (
    <section
      data-screen-label="Lumina landing"
      style={{
        position: "relative",
        overflow: "hidden",
        background:
          "linear-gradient(168deg,#f2ecf8 0%,#ecedfa 36%,#f3ecf2 68%,#efedf9 100%)",
      }}
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* fondo: puntos + blobs animados */}
      <div aria-hidden style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(150,134,182,0.05) 1px,transparent 1.5px)", backgroundSize: "23px 23px", pointerEvents: "none", zIndex: 0 }} />
      <div aria-hidden style={{ position: "absolute", top: -200, left: -160, width: 640, height: 640, borderRadius: "50%", background: "radial-gradient(circle at 40% 40%, rgba(184,172,216,0.24), rgba(184,172,216,0) 70%)", filter: "blur(28px)", animation: "lumBlob 20s ease-in-out infinite", pointerEvents: "none", zIndex: 0 }} />
      <div aria-hidden style={{ position: "absolute", top: 340, right: -220, width: 720, height: 720, borderRadius: "50%", background: "radial-gradient(circle at 50% 50%, rgba(192,202,234,0.24), rgba(192,202,234,0) 70%)", filter: "blur(30px)", animation: "lumBlob2 24s ease-in-out infinite", pointerEvents: "none", zIndex: 0 }} />
      <div aria-hidden style={{ position: "absolute", top: 1900, left: "2%", width: 560, height: 560, borderRadius: "50%", background: "radial-gradient(circle at 50% 50%, rgba(238,219,226,0.32), rgba(238,219,226,0) 70%)", filter: "blur(28px)", animation: "lumBlob 28s ease-in-out infinite", pointerEvents: "none", zIndex: 0 }} />
      <div aria-hidden style={{ position: "absolute", top: 3000, right: "6%", width: 520, height: 520, borderRadius: "50%", background: "radial-gradient(circle at 50% 50%, rgba(184,172,216,0.2), rgba(184,172,216,0) 70%)", filter: "blur(28px)", animation: "lumBlob2 26s ease-in-out infinite", pointerEvents: "none", zIndex: 0 }} />

      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 28px", position: "relative", zIndex: 10 }}>
        {/* NAV */}
        <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, marginTop: 18, padding: "16px 22px", borderRadius: 18, background: "rgba(255,255,255,0.55)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.7)", boxShadow: "0 14px 38px -22px rgba(80,60,120,0.4)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: "linear-gradient(135deg,#ccbde9,#efdde5)", boxShadow: "0 6px 16px -6px rgba(170,152,202,0.7)", position: "relative" }}>
              <div style={{ position: "absolute", inset: 8, borderRadius: "50%", background: "rgba(255,255,255,0.92)" }} />
            </div>
            <span style={{ fontSize: 21, fontWeight: 600, letterSpacing: "-0.01em", color: "#2a2433" }}>Lumina</span>
          </div>
          <div className="nav-links" style={{ display: "flex", alignItems: "center", gap: 30, fontSize: 15, color: "#564f63" }}>
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href} style={{ color: "inherit", textDecoration: "none" }}>{l.label}</a>
            ))}
          </div>
          <a href="#wl" style={{ display: "inline-flex", alignItems: "center", padding: "10px 18px", borderRadius: 11, background: "linear-gradient(135deg,#8f78b8,#b29fd2)", color: "#fff", fontSize: 15, fontWeight: 600, textDecoration: "none", boxShadow: "0 10px 24px -10px rgba(170,152,202,0.8)" }}>Sumarme a la waitlist</a>
        </nav>

        <Hero />
      </div>

      <Bento />
      <BeamFlow />
      <Demo />

      {/* DOS FORMAS DE USARLO */}
      <div id="usar" style={{ maxWidth: 1180, margin: "0 auto", padding: "80px 28px", position: "relative", zIndex: 10 }}>
        <div data-reveal style={{ textAlign: "center", maxWidth: 640, margin: "0 auto 30px" }}>
          <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9a90ad" }}>Dos formas de usarlo</span>
          <h2 className="font-serif sec-h2" style={{ fontWeight: 400, fontSize: 48, lineHeight: 1.04, letterSpacing: "-0.018em", margin: "14px 0", color: "#241f30" }}>Una sola máquina. Dos formas de usarla.</h2>
        </div>
        <UsageToggle />
      </div>

      <Sobre />

      {/* WAITLIST + FOOTER */}
      <div id="wl" style={{ maxWidth: 1180, margin: "0 auto", padding: "40px 28px 96px", position: "relative", zIndex: 10 }}>
        <div data-reveal style={{ position: "relative", textAlign: "center", padding: "68px 32px", borderRadius: 28, overflow: "hidden", background: "rgba(255,255,255,0.5)", backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)", border: "1px solid rgba(255,255,255,0.75)", boxShadow: "0 34px 80px -36px rgba(80,60,120,0.5)" }}>
          <div aria-hidden style={{ position: "absolute", top: -120, left: "50%", transform: "translateX(-50%)", width: 560, height: 300, background: "radial-gradient(ellipse at center,rgba(210,192,232,0.34),rgba(210,192,232,0) 70%)", pointerEvents: "none" }} />
          <div style={{ position: "relative", zIndex: 2, maxWidth: 560, margin: "0 auto" }}>
            <h2 className="font-serif sec-h2" style={{ fontWeight: 400, fontSize: 48, lineHeight: 1.04, letterSpacing: "-0.018em", margin: "0 0 16px", color: "#241f30" }}>Sé de los primeros en generar tours con Lumina.</h2>
            <p style={{ fontSize: 17, lineHeight: 1.55, color: "#5a5369", margin: "0 0 30px" }}>Dejá tu email y te avisamos apenas abramos el acceso. Plazas limitadas para el primer grupo de inmobiliarias.</p>
            <Waitlist />
            <div style={{ fontSize: 13, color: "#9a90ad", marginTop: 16 }}>Sin spam. Solo el aviso de lanzamiento.</div>
          </div>
        </div>

        <footer style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginTop: 46, paddingTop: 28, borderTop: "1px solid rgba(120,90,160,0.14)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 24, height: 24, borderRadius: 7, background: "linear-gradient(135deg,#ccbde9,#efdde5)", position: "relative" }}>
              <div style={{ position: "absolute", inset: 6, borderRadius: "50%", background: "rgba(255,255,255,0.92)" }} />
            </div>
            <span style={{ fontSize: 16, fontWeight: 600, color: "#2a2433" }}>Lumina</span>
            <span style={{ fontSize: 13, color: "#9a90ad", marginLeft: 6 }}>IA para real estate</span>
          </div>
          <div style={{ fontSize: 13, color: "#9a90ad" }}>© 2026 Lumina · Tours virtuales generados con IA</div>
        </footer>
      </div>

      <LandingEffects />
    </section>
  );
}

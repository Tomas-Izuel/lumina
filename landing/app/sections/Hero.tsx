/* Hero — port fiel de la sección <header> de Lumina.dc.html.
   Izquierda: titular con typewriter (data-tw) + lead + CTAs + stats.
   Derecha: fotos ordenadas flotando -> frame del tour (video real) + pill IA.
   Fondo: grid enmascarado animado + beams SVG que aparecen a 1.6s. */

const PHOTOS = [
  { src: "/room-living.jpg", label: "Living", n: "01", rot: "-5deg", mt: "0" },
  { src: "/room-cocina.jpg", label: "Cocina", n: "02", rot: "2deg", mt: "20px" },
  { src: "/room-dormitorio.jpg", label: "Dormitorio", n: "03", rot: "5deg", mt: "6px" },
];

const FLOAT = ["6s", "6.5s", "5.9s"];
const DELAY = ["0s", "0.3s", "0.15s"];

export default function Hero() {
  return (
    <header style={{ position: "relative", padding: "58px 0 104px" }}>
      {/* grid enmascarado */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: "-30px -60px",
          backgroundImage:
            "linear-gradient(rgba(154,131,191,0.06) 1px,transparent 1px),linear-gradient(90deg,rgba(154,131,191,0.06) 1px,transparent 1px)",
          backgroundSize: "46px 46px",
          WebkitMaskImage:
            "radial-gradient(ellipse 72% 72% at 64% 42%,#000 22%,transparent 72%)",
          maskImage:
            "radial-gradient(ellipse 72% 72% at 64% 42%,#000 22%,transparent 72%)",
          animation: "lumGrid 16s linear infinite",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      {/* beams */}
      <svg
        viewBox="0 0 1200 620"
        preserveAspectRatio="none"
        aria-hidden
        style={{
          position: "absolute",
          inset: "-20px -50px",
          width: "calc(100% + 100px)",
          height: "calc(100% + 40px)",
          pointerEvents: "none",
          zIndex: 1,
          overflow: "visible",
          opacity: 0,
          animation: "lumFadeIn 1s ease 1.6s forwards",
          WebkitMaskImage:
            "radial-gradient(ellipse 82% 82% at 56% 46%,#000 28%,transparent 80%)",
          maskImage:
            "radial-gradient(ellipse 82% 82% at 56% 46%,#000 28%,transparent 80%)",
        }}
      >
        <path d="M-40 175 C 250 55, 520 300, 820 155 S 1240 115, 1260 235" fill="none" stroke="rgba(154,131,191,0.3)" strokeWidth="1.5" strokeDasharray="7 17" style={{ animation: "lumStroke 7s linear infinite" }} />
        <path d="M-40 360 C 300 235, 560 470, 900 320 S 1260 360, 1260 420" fill="none" stroke="rgba(168,180,232,0.3)" strokeWidth="1.5" strokeDasharray="7 17" style={{ animation: "lumStroke 9s linear infinite", animationDelay: "-2.5s" }} />
        <path d="M-40 505 C 280 420, 600 605, 880 460 S 1240 520, 1260 545" fill="none" stroke="rgba(202,187,233,0.32)" strokeWidth="1.5" strokeDasharray="7 17" style={{ animation: "lumStroke 8s linear infinite", animationDelay: "-4s" }} />
        <path d="M-40 90 C 320 145, 640 35, 980 150 S 1260 225, 1260 200" fill="none" stroke="rgba(154,131,191,0.18)" strokeWidth="1" strokeDasharray="4 13" style={{ animation: "lumStroke 11s linear infinite", animationDelay: "-5.5s" }} />
      </svg>

      <div
        className="hero-grid"
        style={{
          position: "relative",
          zIndex: 5,
          display: "grid",
          gridTemplateColumns: "1fr 1.12fr",
          gap: 20,
          alignItems: "center",
        }}
      >
        {/* LEFT */}
        <div data-reveal>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "7px 14px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.65)",
              border: "1px solid rgba(255,255,255,0.85)",
              fontSize: 13,
              fontWeight: 600,
              color: "#8b7cae",
              letterSpacing: "0.02em",
              marginBottom: 28,
              boxShadow: "0 6px 16px -12px rgba(80,60,120,0.5)",
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#9a83bf", animation: "lumPulseSoft 2.4s ease-in-out infinite" }} />
            IA para real estate · Tours virtuales
          </div>

          <h1
            className="font-serif hero-h1"
            style={{ fontWeight: 400, fontSize: 74, lineHeight: 0.98, letterSpacing: "-0.02em", margin: "0 0 24px", color: "#241f30" }}
          >
            <span data-tw>Fotos</span> <span data-tw>sueltas,</span>
            <br />
            <span data-tw>un</span>{" "}
            <span data-tw style={{ fontStyle: "italic", color: "#9a83bf" }}>tour</span>{" "}
            <span data-tw style={{ fontStyle: "italic", color: "#9a83bf" }}>que</span>{" "}
            <span data-tw style={{ position: "relative", fontStyle: "italic", color: "#9a83bf", whiteSpace: "nowrap" }}>
              vende
              <span style={{ position: "absolute", left: 0, right: 0, bottom: 7, height: 7, borderRadius: 4, background: "linear-gradient(90deg,#cabbe9,#efdde5)", transformOrigin: "left", animation: "lumUnderline 0.9s cubic-bezier(0.4,0,0.2,1) 1.55s both", zIndex: -1 }} />
            </span>
            <span data-tw>.</span>
            <span style={{ display: "inline-block", width: 5, height: "0.78em", background: "#9a83bf", borderRadius: 2, marginLeft: 8, verticalAlign: "-0.06em", animation: "lumBlink 0.9s steps(1) infinite" }} />
          </h1>

          <p style={{ fontSize: 19, lineHeight: 1.55, color: "#5a5369", maxWidth: 460, margin: "0 0 34px" }}>
            Lumina ordena las fotos de tu propiedad con IA y genera un{" "}
            <strong style={{ fontWeight: 600, color: "#3d3650" }}>tour virtual en video</strong>, profesional y en minutos. Por API o desde la web.
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center" }}>
            <a href="#wl" style={{ display: "inline-flex", alignItems: "center", gap: 9, padding: "15px 26px", borderRadius: 13, background: "linear-gradient(135deg,#8f78b8,#b29fd2)", color: "#fff", fontSize: 16, fontWeight: 600, textDecoration: "none", boxShadow: "0 16px 34px -12px rgba(170,152,202,0.85)" }}>
              Sumarme a la waitlist <span style={{ fontSize: 18 }}>→</span>
            </a>
            <a href="#como" style={{ display: "inline-flex", alignItems: "center", gap: 9, padding: "15px 24px", borderRadius: 13, background: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.85)", color: "#4a4359", fontSize: 16, fontWeight: 600, textDecoration: "none", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" }}>
              Ver cómo funciona
            </a>
          </div>

          <div className="hero-stats" style={{ display: "flex", gap: 30, marginTop: 46 }}>
            <div>
              <div className="font-serif" style={{ fontSize: 31, color: "#241f30", lineHeight: 1 }}>~2 min</div>
              <div style={{ fontSize: 13, color: "#7a7388", marginTop: 6 }}>de fotos a tour</div>
            </div>
            <div style={{ width: 1, background: "rgba(120,90,160,0.18)" }} />
            <div>
              <div className="font-serif" style={{ fontSize: 31, color: "#241f30", lineHeight: 1 }}>0</div>
              <div style={{ fontSize: 13, color: "#7a7388", marginTop: 6 }}>equipos de filmación</div>
            </div>
            <div style={{ width: 1, background: "rgba(120,90,160,0.18)" }} />
            <div>
              <div className="font-serif" style={{ fontSize: 31, color: "#241f30", lineHeight: 1 }}>API + Web</div>
              <div style={{ fontSize: 13, color: "#7a7388", marginTop: 6 }}>dos formas de usarlo</div>
            </div>
          </div>
        </div>

        {/* RIGHT: fotos ordenadas -> tour */}
        <div className="hero-art" style={{ position: "relative", height: 520 }}>
          <div data-px="0.05" className="hero-photos" style={{ position: "absolute", left: 0, right: 0, top: 18, zIndex: 14, display: "flex", justifyContent: "center", alignItems: "flex-start", gap: 14 }}>
            {PHOTOS.map((p, i) => (
              <div key={p.n} style={{ animation: `lumFloat ${FLOAT[i]} ease-in-out infinite`, animationDelay: DELAY[i], marginTop: p.mt }}>
                <div className="hero-photo" style={{ position: "relative", width: 122, height: 92, borderRadius: 13, overflow: "hidden", transform: `rotate(${p.rot})`, boxShadow: "0 18px 38px -20px rgba(80,60,120,0.6)", border: "5px solid rgba(255,255,255,0.92)" }}>
                  <img src={p.src} alt={p.label} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  <span className="font-mono" style={{ position: "absolute", top: 6, left: 6, width: 20, height: 20, borderRadius: 6, background: "rgba(255,255,255,0.92)", color: "#9a83bf", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{p.n}</span>
                </div>
              </div>
            ))}
          </div>

          {/* tour frame (output) */}
          <div data-px="0.02" className="hero-tourframe" style={{ position: "absolute", left: "50%", marginLeft: -180, top: 182, width: 360, zIndex: 10 }}>
            <div style={{ animation: "lumFloat 6.8s ease-in-out infinite" }}>
              <div style={{ position: "relative", borderRadius: 18, overflow: "hidden", transform: "rotate(-2deg)", boxShadow: "0 40px 80px -34px rgba(80,60,120,0.55)", border: "6px solid rgba(255,255,255,0.9)" }}>
                <div style={{ position: "relative", aspectRatio: "16/10", overflow: "hidden", background: "#221d2e" }}>
                  <video autoPlay muted loop playsInline poster="/hero-poster.jpg" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }}>
                    <source src="/hero.webm" type="video/webm" />
                    <source src="/hero.mp4" type="video/mp4" />
                  </video>
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top,rgba(28,23,40,0.55),transparent 55%)" }} />
                  <div style={{ position: "absolute", left: 0, right: 0, height: 2, background: "linear-gradient(90deg,transparent,rgba(202,187,233,0.95),transparent)", boxShadow: "0 0 12px rgba(202,187,233,0.8)", animation: "lumScanY 4.5s ease-in-out infinite" }} />
                  <div style={{ position: "absolute", top: 12, left: 12, padding: "5px 11px", borderRadius: 999, fontSize: 11, fontWeight: 600, color: "#fff", background: "rgba(255,255,255,0.2)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.25)" }}>Living → Cocina</div>
                  <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: 54, height: 54, borderRadius: "50%", background: "rgba(255,255,255,0.92)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 10px 24px -8px rgba(0,0,0,0.5)" }}>
                    <div style={{ width: 0, height: 0, borderLeft: "16px solid #9a83bf", borderTop: "10px solid transparent", borderBottom: "10px solid transparent", marginLeft: 4 }} />
                  </div>
                  <div style={{ position: "absolute", left: 12, right: 12, bottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: "rgba(255,255,255,0.9)", marginBottom: 6, fontWeight: 500 }}>
                      <span>Tour · 1080p</span><span>0:42</span>
                    </div>
                    <div style={{ height: 4, borderRadius: 3, background: "rgba(255,255,255,0.3)", overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: 3, background: "#fff", animation: "lumProg 9s linear infinite" }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* IA pill */}
          <div data-px="0.09" className="hero-iapill" style={{ position: "absolute", left: 6, top: 150, zIndex: 25 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 9, padding: "9px 15px", borderRadius: 999, background: "rgba(255,255,255,0.85)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.92)", boxShadow: "0 16px 34px -16px rgba(80,60,120,0.55)" }}>
              <span style={{ width: 16, height: 16, border: "2px solid #9a83bf", borderTopColor: "transparent", borderRadius: "50%", animation: "lumSpin 1.2s linear infinite" }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: "#574c6b" }}>IA analizando ambientes</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

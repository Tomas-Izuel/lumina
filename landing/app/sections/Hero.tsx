"use client";

import { useCallback, useState } from "react";
import LuminaHouse from "../components/LuminaHouse";

/* iconos reutilizados en chips y cards de capítulo */
const IconPin = ({ color = "#9a83bf" }: { color?: string }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);
const IconPlay = ({ color = "#7684b0" }: { color?: string }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="6 3 20 12 6 21 6 3" />
  </svg>
);
const IconCube = ({ color = "#b06a97" }: { color?: string }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2 3 7v10l9 5 9-5V7Z" />
    <path d="M12 22V12" />
    <path d="M3 7l9 5 9-5" />
  </svg>
);

const chapterCard: React.CSSProperties = {
  position: "absolute",
  top: 18,
  left: 18,
  transition: "opacity 0.55s ease, transform 0.55s ease",
  display: "inline-flex",
  alignItems: "center",
  gap: 11,
  padding: "12px 16px",
  borderRadius: 15,
  background: "rgba(255,255,255,0.86)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid rgba(255,255,255,0.92)",
  boxShadow: "0 16px 34px -16px rgba(80,60,120,0.5)",
};

function on(active: boolean): React.CSSProperties {
  return active
    ? { opacity: 1, transform: "none", pointerEvents: "auto" }
    : { opacity: 0, transform: "translateY(-6px)", pointerEvents: "none" };
}

function Chip({ icon, bg, title, status, statusColor }: { icon: React.ReactNode; bg: string; title: string; status: string; statusColor: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 15px 9px 9px", borderRadius: 14, background: "rgba(255,255,255,0.72)", border: "1px solid rgba(255,255,255,0.92)", boxShadow: "0 12px 26px -18px rgba(80,60,120,0.55)" }}>
      <span style={{ width: 32, height: 32, borderRadius: 10, background: bg, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>{icon}</span>
      <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#2a2433" }}>{title}</span>
        <span style={{ fontSize: 10.5, fontWeight: 600, color: statusColor }}>{status}</span>
      </span>
    </div>
  );
}

export default function Hero() {
  const [chapter, setChapter] = useState(0);
  const onChapter = useCallback((ch: number) => setChapter(ch), []);

  return (
    <header style={{ position: "relative", padding: "24px 0 82px" }}>
      <div className="hero-grid" style={{ position: "relative", zIndex: 5, display: "grid", gridTemplateColumns: "0.92fr 1.08fr", gap: 24, alignItems: "center" }}>
        {/* LEFT */}
        <div data-reveal>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "7px 14px", borderRadius: 999, background: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.85)", fontSize: 13, fontWeight: 600, color: "#8b7cae", letterSpacing: "0.02em", marginBottom: 26, boxShadow: "0 6px 16px -12px rgba(80,60,120,0.5)" }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#9a83bf", animation: "lumPulseSoft 2.4s ease-in-out infinite" }} />
            Kit de IA para real estate
          </div>
          <h1 className="font-serif hero-h1" style={{ fontWeight: 400, fontSize: 66, lineHeight: 0.99, letterSpacing: "-0.02em", margin: "0 0 22px", color: "#241f30" }}>
            <span data-tw>Conocé</span> <span data-tw>la</span> <span data-tw>propiedad</span>
            <br />
            <span data-tw>antes</span> <span data-tw>de</span>{" "}
            <span data-tw style={{ fontStyle: "italic", color: "#9a83bf", position: "relative", whiteSpace: "nowrap" }}>
              mostrarla
              <span aria-hidden style={{ position: "absolute", left: 0, right: 0, bottom: 6, height: 7, borderRadius: 4, background: "linear-gradient(90deg,#cabbe9,#efdde5)", transformOrigin: "left", animation: "lumUnderline 0.9s cubic-bezier(0.4,0,0.2,1) 1.5s both", zIndex: -1 }} />
            </span>
            <span data-tw>.</span>
          </h1>
          <p style={{ fontSize: 18, lineHeight: 1.55, color: "#5a5369", maxWidth: 450, margin: "0 0 30px" }}>
            Estimá su valor de <strong style={{ fontWeight: 600, color: "#3d3650" }}>venta y arriendo</strong>, convertí fotos en un tour y —pronto— recorré su modelo 3D. El kit de IA que potencia cada operación.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center" }}>
            <a href="#wl" style={{ display: "inline-flex", alignItems: "center", gap: 9, padding: "15px 26px", borderRadius: 13, background: "linear-gradient(135deg,#8f78b8,#b29fd2)", color: "#fff", fontSize: 16, fontWeight: 600, textDecoration: "none", boxShadow: "0 16px 34px -12px rgba(170,152,202,0.85)" }}>
              Sumarme a la waitlist <span style={{ fontSize: 18 }}>→</span>
            </a>
            <a href="#productos" style={{ display: "inline-flex", alignItems: "center", gap: 9, padding: "15px 24px", borderRadius: 13, background: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.85)", color: "#4a4359", fontSize: 16, fontWeight: 600, textDecoration: "none", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" }}>
              Ver los productos
            </a>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 38, flexWrap: "wrap" }}>
            <Chip icon={<IconPin />} bg="rgba(154,131,191,0.16)" title="Estimación" status="Disponible" statusColor="#3d8a63" />
            <Chip icon={<IconPlay />} bg="rgba(159,182,230,0.2)" title="Tour en video" status="Disponible" statusColor="#3d8a63" />
            <Chip icon={<IconCube />} bg="rgba(197,143,180,0.18)" title="Modelo 3D" status="Próximamente" statusColor="#b06a97" />
          </div>
        </div>

        {/* RIGHT: modelo 3D */}
        <div style={{ position: "relative" }}>
          <div style={{ position: "relative", borderRadius: 24, overflow: "hidden", background: "linear-gradient(165deg,rgba(255,255,255,0.55),rgba(233,226,246,0.4))", border: "1px solid rgba(255,255,255,0.75)", boxShadow: "0 40px 90px -40px rgba(80,60,120,0.6)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}>
            <div className="hero-stage" style={{ position: "relative", height: 540 }}>
              <LuminaHouse onChapter={onChapter} />

              <div style={{ position: "absolute", top: 20, right: 18, display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 12px", borderRadius: 999, background: "rgba(36,31,48,0.5)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", color: "#fff", fontSize: 11, fontWeight: 600, letterSpacing: "0.02em", zIndex: 3 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#7fe0a6", boxShadow: "0 0 8px #7fe0a6", animation: "lumPulseSoft 1.8s ease-in-out infinite" }} />
                Gemelo digital · en vivo
              </div>

              {/* cap 0 · estimación */}
              <div style={{ ...chapterCard, ...on(chapter === 0) }}>
                <span style={{ width: 32, height: 32, borderRadius: 9, background: "rgba(154,131,191,0.14)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><IconPin /></span>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "#8b7cae", lineHeight: 1 }}>Valor estimado</div>
                  <div className="font-serif" style={{ fontSize: 21, color: "#241f30", lineHeight: 1.25 }}>$ 265.000.000</div>
                  <div style={{ fontSize: 11.5, color: "#7a7388", lineHeight: 1, marginTop: 2 }}>Arriendo $ 820.000 / mes</div>
                </div>
              </div>

              {/* cap 1 · tour */}
              <div style={{ ...chapterCard, ...on(chapter === 1) }}>
                <span style={{ width: 32, height: 32, borderRadius: 9, background: "rgba(159,182,230,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><IconPlay /></span>
                <div style={{ minWidth: 150 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "#7684b0", lineHeight: 1 }}>Tour en video</div>
                  <div className="font-serif" style={{ fontSize: 19, color: "#241f30", lineHeight: 1.3 }}>Living → Dormitorio</div>
                  <div style={{ height: 4, borderRadius: 3, background: "rgba(120,90,160,0.16)", overflow: "hidden", marginTop: 6 }}>
                    <div style={{ height: "100%", borderRadius: 3, background: "linear-gradient(90deg,#b29fd2,#9fb6e6)", animation: "lumProg 5s linear infinite" }} />
                  </div>
                </div>
              </div>

              {/* cap 2 · gemelo digital */}
              <div style={{ ...chapterCard, ...on(chapter === 2) }}>
                <span style={{ width: 32, height: 32, borderRadius: 9, background: "rgba(197,143,180,0.18)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><IconCube /></span>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "#b06a97", lineHeight: 1 }}>Modelo 3D · beta</div>
                  <div className="font-serif" style={{ fontSize: 19, color: "#241f30", lineHeight: 1.3 }}>Escaneando ambientes…</div>
                  <div style={{ fontSize: 11.5, color: "#7a7388", lineHeight: 1, marginTop: 2 }}>Recorrible · próximamente</div>
                </div>
              </div>

              {/* stepper */}
              <div style={{ position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: 11, padding: "8px 16px", borderRadius: 999, background: "rgba(255,255,255,0.74)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.85)", boxShadow: "0 12px 28px -16px rgba(80,60,120,0.45)", zIndex: 3 }}>
                {["Estimación", "Tour", "Modelo 3D"].map((lab, i) => (
                  <span key={lab} style={{ display: "contents" }}>
                    {i > 0 && <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#c9bfd8" }} />}
                    <span style={{ fontSize: 12, fontWeight: chapter === i ? 700 : 600, color: chapter === i ? "#9a83bf" : "#a49bb3", transition: "color 0.4s" }}>{lab}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

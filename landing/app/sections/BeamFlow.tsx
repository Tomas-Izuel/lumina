/* El flujo — animated beam diagram (port fiel de Lumina.dc.html).
   3 entradas (Fotos/Orden/Estilo) -> hub Lumina IA -> 3 salidas. */

const PATHS = [
  "M120 110 C 300 110, 330 220, 500 220",
  "M120 220 C 300 220, 360 220, 500 220",
  "M120 330 C 300 330, 330 220, 500 220",
  "M500 220 C 670 220, 700 110, 880 110",
  "M500 220 C 700 220, 640 220, 880 220",
  "M500 220 C 670 220, 700 330, 880 330",
];
const BEAM = [
  { d: PATHS[0], c: "#b29fd2", g: "178,159,210", delay: "0s" },
  { d: PATHS[1], c: "#b29fd2", g: "178,159,210", delay: "0.5s" },
  { d: PATHS[2], c: "#b29fd2", g: "178,159,210", delay: "1s" },
  { d: PATHS[3], c: "#b29fd2", g: "178,159,210", delay: "1.4s" },
  { d: PATHS[4], c: "#9fb6e6", g: "159,182,230", delay: "1.7s" },
  { d: PATHS[5], c: "#6fc79a", g: "111,199,154", delay: "2s" },
];

const node: React.CSSProperties = {
  width: 58,
  height: 58,
  borderRadius: "50%",
  background: "rgba(255,255,255,0.92)",
  border: "1px solid rgba(255,255,255,0.95)",
  boxShadow: "0 14px 30px -16px rgba(80,60,120,0.6)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};
const nodeLabel: React.CSSProperties = {
  position: "absolute",
  top: "100%",
  left: "50%",
  transform: "translateX(-50%)",
  marginTop: 9,
  fontSize: 12,
  fontWeight: 600,
  color: "#574c6b",
  whiteSpace: "nowrap",
};

function Node({ left, top, label, children }: { left: string; top: string; label: string; children: React.ReactNode }) {
  return (
    <div style={{ position: "absolute", left, top, transform: "translate(-50%,-50%)", zIndex: 5 }}>
      <div className="beam-node" style={node}>{children}</div>
      <span style={nodeLabel}>{label}</span>
    </div>
  );
}

const ico = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export default function BeamFlow() {
  return (
    <div id="flujo" style={{ maxWidth: 1180, margin: "0 auto", padding: "90px 28px", position: "relative", zIndex: 10 }}>
      <div data-reveal style={{ maxWidth: 560, margin: "0 0 44px auto", textAlign: "right" }}>
        <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9a90ad" }}>El flujo, de punta a punta</span>
        <h2 className="font-serif sec-h2" style={{ fontWeight: 400, fontSize: 48, lineHeight: 1.04, letterSpacing: "-0.018em", margin: "14px 0", color: "#241f30" }}>Una máquina que nunca para.</h2>
        <p style={{ fontSize: 17, lineHeight: 1.55, color: "#5a5369", margin: 0 }}>Entran fotos y orden, sale un tour distribuido a cada canal — todo automático.</p>
      </div>

      <div data-reveal style={{ position: "relative", borderRadius: 24, background: "rgba(255,255,255,0.5)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.72)", boxShadow: "0 30px 64px -32px rgba(80,60,120,0.45)", padding: 30 }}>
        <div className="beam-stage" style={{ position: "relative", width: "100%", height: 440 }}>
          <svg viewBox="0 0 1000 440" preserveAspectRatio="none" aria-hidden style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}>
            {PATHS.map((d, i) => (
              <path key={`bg${i}`} d={d} fill="none" stroke="rgba(154,131,191,0.16)" strokeWidth="2" />
            ))}
            {BEAM.map((b, i) => (
              <path key={`bm${i}`} d={b.d} fill="none" stroke={b.c} strokeWidth="3" strokeLinecap="round" strokeDasharray="26 640" style={{ filter: `drop-shadow(0 0 5px rgba(${b.g},0.85))`, animation: "lumBeamPath 2.6s linear infinite", animationDelay: b.delay }} />
            ))}
          </svg>

          {/* entradas */}
          <Node left="12%" top="25%" label="Fotos">
            <svg {...ico} stroke="#9a83bf"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.6-3.6a2 2 0 0 0-2.8 0L6 21" /></svg>
          </Node>
          <Node left="12%" top="50%" label="Orden">
            <svg {...ico} stroke="#9a83bf"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
          </Node>
          <Node left="12%" top="75%" label="Estilo">
            <svg {...ico} stroke="#9a83bf"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" /></svg>
          </Node>

          {/* hub */}
          <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", zIndex: 8 }}>
            <div className="beam-hub" style={{ position: "relative", width: 120, height: 120, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "1.5px solid rgba(154,131,191,0.45)", animation: "lumRing 2.8s ease-out infinite" }} />
              <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "1.5px solid rgba(154,131,191,0.45)", animation: "lumRing 2.8s ease-out infinite", animationDelay: "1.4s" }} />
              <div className="beam-hub-core" style={{ width: 96, height: 96, borderRadius: "50%", background: "linear-gradient(135deg,#8f78b8,#b29fd2)", boxShadow: "0 22px 44px -16px rgba(170,152,202,0.85)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 5, animation: "lumPulseScale 4s ease-in-out infinite" }}>
                <div style={{ width: 34, height: 34, borderRadius: 11, background: "rgba(255,255,255,0.95)", position: "relative" }}>
                  <div style={{ position: "absolute", inset: 9, borderRadius: "50%", border: "2.5px solid #9a83bf" }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", letterSpacing: "0.02em" }}>Lumina IA</span>
              </div>
            </div>
            <span className="font-mono" style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", marginTop: 8, fontSize: 11, color: "#8a8299", whiteSpace: "nowrap" }}>render → tour.mp4</span>
          </div>

          {/* salidas */}
          <Node left="88%" top="25%" label="Portales">
            <svg {...ico} stroke="#9a83bf"><path d="M3 21h18" /><path d="M5 21V7l8-4v18" /><path d="M19 21V11l-6-4" /><path d="M9 9v.01M9 12v.01M9 15v.01" /></svg>
          </Node>
          <Node left="88%" top="50%" label="Redes">
            <svg {...ico} stroke="#7684b0"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.6 13.5l6.8 4" /><path d="M15.4 6.5l-6.8 4" /></svg>
          </Node>
          <Node left="88%" top="75%" label="WhatsApp">
            <svg {...ico} stroke="#3d8a63"><path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.38 8.38 0 0 1-4-1L3 21l2-5.5a8.38 8.38 0 0 1-1-4 8.5 8.5 0 0 1 17 0z" /></svg>
          </Node>
        </div>
      </div>
    </div>
  );
}

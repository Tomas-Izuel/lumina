/* Sobre Lumina — card con gradiente + 3 beneficios. */

const benefitRow: React.CSSProperties = { display: "flex", gap: 14, alignItems: "center", padding: 16, borderRadius: 14, background: "rgba(255,255,255,0.62)" };
const iconBox: React.CSSProperties = { width: 34, height: 34, borderRadius: 10, background: "rgba(255,255,255,0.7)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" };
const ico = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "#9a83bf", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export default function Sobre() {
  return (
    <div id="sobre" style={{ maxWidth: 1120, margin: "0 auto", padding: "72px 34px", position: "relative", zIndex: 10 }}>
      <div data-reveal className="sobre-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "center", padding: 48, borderRadius: 26, background: "linear-gradient(135deg,rgba(184,172,216,0.22),rgba(238,219,226,0.28))", border: "1px solid rgba(255,255,255,0.6)", boxShadow: "0 28px 64px -34px rgba(80,60,120,0.4)" }}>
        <div>
          <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9a90ad" }}>Sobre Lumina</span>
          <h2 className="font-serif sec-h2" style={{ fontWeight: 400, fontSize: 38, lineHeight: 1.1, letterSpacing: "-0.018em", margin: "14px 0 16px", color: "#241f30" }}>Herramientas de IA, agnósticas, para vender y arrendar más rápido.</h2>
          <p style={{ fontSize: 16, lineHeight: 1.6, color: "#544d62", margin: 0 }}>Lumina no es una sola app: es un kit de herramientas de inteligencia artificial que se conecta a tu forma de trabajar. El estimador de valor está disponible hoy; el tour en video ya funciona; y el modelo 3D recorrible llega pronto — todo pensado para que brokers e inmobiliarias cierren operaciones antes.</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={benefitRow}>
            <span style={iconBox}><svg {...ico}><path d="M3 17l6-6 4 4 8-8" /><path d="M17 7h4v4" /></svg></span>
            <div>
              <div style={{ fontWeight: 600, color: "#2a2433", fontSize: 15 }}>Precio con fundamento</div>
              <div style={{ fontSize: 14, color: "#6b6478" }}>Estimás valores con datos, no con corazonadas.</div>
            </div>
          </div>
          <div style={benefitRow}>
            <span style={iconBox}><svg {...ico}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg></span>
            <div>
              <div style={{ fontWeight: 600, color: "#2a2433", fontSize: 15 }}>Publicación en minutos</div>
              <div style={{ fontSize: 14, color: "#6b6478" }}>Sin coordinar filmaciones ni edición.</div>
            </div>
          </div>
          <div style={benefitRow}>
            <span style={iconBox}><svg {...ico}><circle cx="12" cy="12" r="9" /><path d="M8 12l3 3 5-6" /></svg></span>
            <div>
              <div style={{ fontWeight: 600, color: "#2a2433", fontSize: 15 }}>Una sola plataforma</div>
              <div style={{ fontSize: 14, color: "#6b6478" }}>Estimación, video y 3D en un mismo lugar.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

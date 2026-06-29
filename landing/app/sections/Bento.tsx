/* Cómo funciona — bento grid de 6 columnas (port fiel de Lumina.dc.html). */

const card: React.CSSProperties = {
  position: "relative",
  overflow: "hidden",
  borderRadius: 22,
  background: "rgba(255,255,255,0.55)",
  backdropFilter: "blur(14px)",
  WebkitBackdropFilter: "blur(14px)",
  border: "1px solid rgba(255,255,255,0.7)",
  boxShadow: "0 22px 48px -28px rgba(80,60,120,0.4)",
  padding: 26,
  display: "flex",
  flexDirection: "column",
};

const stepRow = (n: string) => (
  <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 9 }}>
    <span className="font-mono" style={{ fontSize: 12, color: "#9a83bf", fontWeight: 500 }}>{n}</span>
    <span style={{ width: 18, height: 1, background: "rgba(154,131,191,0.4)" }} />
  </div>
);

const h3: React.CSSProperties = { fontSize: 20, fontWeight: 600, color: "#2a2433", margin: "0 0 8px" };
const pStyle: React.CSSProperties = { fontSize: 14.5, lineHeight: 1.55, color: "#605971", margin: 0 };

function Num({ n }: { n: string }) {
  return (
    <span className="font-mono" style={{ position: "absolute", top: 6, left: 6, width: 18, height: 18, borderRadius: 5, background: "rgba(255,255,255,0.92)", color: "#9a83bf", fontSize: 9.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{n}</span>
  );
}

export default function Bento() {
  return (
    <div id="como" style={{ maxWidth: 1180, margin: "0 auto", padding: "96px 28px 36px", position: "relative", zIndex: 10 }}>
      <div data-reveal style={{ maxWidth: 660, margin: "0 0 46px" }}>
        <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9a90ad" }}>Cómo funciona</span>
        <h2 className="font-serif sec-h2" style={{ fontWeight: 400, fontSize: 48, lineHeight: 1.04, letterSpacing: "-0.018em", margin: "14px 0 14px", color: "#241f30" }}>Tres pasos. Cero producción.</h2>
        <p style={{ fontSize: 17, lineHeight: 1.55, color: "#5a5369", margin: 0, maxWidth: 520 }}>De un puñado de fotos a un recorrido cinematográfico que tus clientes ven desde el celular.</p>
      </div>

      <div className="bento" style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 18 }}>
        {/* A: subir fotos */}
        <div data-reveal style={{ ...card, gridColumn: "span 3" }}>
          <div style={{ flex: 1, display: "flex", gap: 10, alignItems: "stretch", marginBottom: 22, minHeight: 150 }}>
            {[
              { src: "/room-living.jpg", n: "01", ty: "0" },
              { src: "/room-cocina.jpg", n: "02", ty: "8px" },
              { src: "/room-dormitorio.jpg", n: "03", ty: "0" },
            ].map((p) => (
              <div key={p.n} style={{ position: "relative", flex: 1, borderRadius: 11, overflow: "hidden", boxShadow: "0 8px 18px -10px rgba(80,60,120,0.5)", transform: `translateY(${p.ty})` }}>
                <img src={p.src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                <Num n={p.n} />
              </div>
            ))}
            <div style={{ flex: 0.7, borderRadius: 11, border: "1.5px dashed rgba(154,131,191,0.4)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, color: "#b29ad0" }}>
              <span style={{ fontSize: 22, lineHeight: 1 }}>+</span>
              <span style={{ fontSize: 9.5 }}>soltar</span>
            </div>
          </div>
          {stepRow("01")}
          <h3 style={h3}>Subí las fotos en orden</h3>
          <p style={pStyle}>Cargá las fotos del inmueble y arrastrá para definir el recorrido. Vos marcás la secuencia, Lumina la respeta.</p>
        </div>

        {/* B: IA scan */}
        <div data-reveal style={{ ...card, gridColumn: "span 3" }}>
          <div style={{ position: "relative", flex: 1, borderRadius: 14, overflow: "hidden", marginBottom: 22, minHeight: 150, background: "#221d2e" }}>
            <div style={{ position: "absolute", inset: 0, animation: "lumKen 14s ease-in-out infinite" }}>
              <img src="/tour-hero.jpg" alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            </div>
            <div style={{ position: "absolute", inset: 14, border: "1.5px dashed rgba(202,187,233,0.7)", borderRadius: 8 }} />
            <div style={{ position: "absolute", left: 0, right: 0, height: 2, background: "linear-gradient(90deg,transparent,rgba(202,187,233,0.95),transparent)", boxShadow: "0 0 12px rgba(202,187,233,0.85)", animation: "lumScanY 3.6s ease-in-out infinite" }} />
            <div style={{ position: "absolute", left: 12, bottom: 12, display: "flex", gap: 6, flexWrap: "wrap" }}>
              {[
                { t: "living", d: "0s" },
                { t: "ventanal", d: "0.6s" },
                { t: "cámara →", d: "1.2s" },
              ].map((tag) => (
                <span key={tag.t} style={{ fontSize: 10.5, fontWeight: 600, color: "#fff", background: "rgba(255,255,255,0.18)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", borderRadius: 6, padding: "3px 8px", animation: "lumPulseSoft 2s ease-in-out infinite", animationDelay: tag.d }}>{tag.t}</span>
              ))}
            </div>
          </div>
          {stepRow("02")}
          <h3 style={h3}>La IA arma el recorrido</h3>
          <p style={pStyle}>Interpreta cada ambiente, suaviza las transiciones y monta el video con movimiento de cámara profesional.</p>
        </div>

        {/* C: canales */}
        <div data-reveal style={{ ...card, gridColumn: "span 2" }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 10, marginBottom: 22, minHeight: 150 }}>
            {[
              { t: "Portales", c: "#9a83bf" },
              { t: "Redes", c: "#bcc4ec" },
              { t: "WhatsApp", c: "#5fb88a" },
            ].map((ch) => (
              <div key={ch.t} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 13px", borderRadius: 11, background: "#fff", border: "1px solid rgba(120,90,160,0.1)", boxShadow: "0 6px 16px -12px rgba(80,60,120,0.4)" }}>
                <span style={{ width: 9, height: 9, borderRadius: 3, background: ch.c }} />
                <span style={{ fontSize: 13.5, fontWeight: 600, color: "#2a2433", flex: 1 }}>{ch.t}</span>
                <span style={{ color: "#5fb88a", fontSize: 13 }}>✓</span>
              </div>
            ))}
          </div>
          {stepRow("03")}
          <h3 style={h3}>Compartí el tour</h3>
          <p style={pStyle}>Un video listo para publicar donde quieras.</p>
        </div>

        {/* D: resultado player */}
        <div data-reveal style={{ ...card, gridColumn: "span 4", padding: 26 }}>
          <div className="bento-d-inner" style={{ display: "grid", gridTemplateColumns: "1.25fr 1fr", gap: 24, alignItems: "center", flex: 1 }}>
            <div style={{ position: "relative", borderRadius: 14, overflow: "hidden", aspectRatio: "16/9", background: "#221d2e", boxShadow: "0 16px 34px -18px rgba(80,60,120,0.6)" }}>
              <div style={{ position: "absolute", inset: 0, animation: "lumKen 16s ease-in-out infinite" }}>
                <img src="/room-balcon.jpg" alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </div>
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top,rgba(28,23,40,0.6),transparent 50%)" }} />
              <div style={{ position: "absolute", top: 10, left: 10, padding: "4px 9px", borderRadius: 999, fontSize: 10, fontWeight: 600, color: "#fff", background: "rgba(255,255,255,0.2)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}>Living</div>
              <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: 46, height: 46, borderRadius: "50%", background: "rgba(255,255,255,0.92)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: 0, height: 0, borderLeft: "14px solid #9a83bf", borderTop: "9px solid transparent", borderBottom: "9px solid transparent", marginLeft: 3 }} />
              </div>
              <div style={{ position: "absolute", left: 12, right: 12, bottom: 12, height: 4, borderRadius: 3, background: "rgba(255,255,255,0.3)", overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 3, background: "#fff", animation: "lumProg 11s linear infinite" }} />
              </div>
            </div>
            <div>
              <div className="font-mono" style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 11, color: "#5fb88a", background: "rgba(95,184,138,0.13)", borderRadius: 7, padding: "4px 9px", marginBottom: 12 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#5fb88a" }} />resultado
              </div>
              <h3 style={h3}>Un tour que se ve profesional</h3>
              <p style={pStyle}>Movimiento de cámara fluido, transiciones suaves y calidad 1080p — sin filmar ni editar.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Demo — "Mirá un tour real." Reproductor con el tour real (video). */

export default function Demo() {
  return (
    <div id="demo" style={{ maxWidth: 1180, margin: "0 auto", padding: "80px 28px", position: "relative", zIndex: 10 }}>
      <div data-reveal style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 24, marginBottom: 26, flexWrap: "wrap" }}>
        <div>
          <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9a90ad" }}>Demo</span>
          <h2 className="font-serif sec-h2" style={{ fontWeight: 400, fontSize: 44, lineHeight: 1.05, letterSpacing: "-0.018em", margin: "12px 0 0", color: "#241f30" }}>Mirá un tour real.</h2>
        </div>
        <span style={{ fontSize: 14, color: "#7a7388", maxWidth: 300 }}>Un recorrido generado por Lumina a partir de fotos de una propiedad.</span>
      </div>

      <div data-reveal style={{ position: "relative", borderRadius: 26, overflow: "hidden", background: "rgba(255,255,255,0.5)", backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)", border: "1px solid rgba(255,255,255,0.75)", boxShadow: "0 36px 80px -36px rgba(80,60,120,0.5)", padding: 18 }}>
        <div style={{ position: "relative", borderRadius: 18, overflow: "hidden", aspectRatio: "16/9", background: "#221d2e" }}>
          <video autoPlay muted loop playsInline poster="/hero-poster.jpg" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }}>
            <source src="/hero.webm" type="video/webm" />
            <source src="/hero.mp4" type="video/mp4" />
          </video>
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top,rgba(28,23,40,0.62),transparent 45%)" }} />
          <div style={{ position: "absolute", top: 18, left: 18, display: "flex", gap: 8 }}>
            <span style={{ padding: "6px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600, color: "#fff", background: "rgba(255,255,255,0.18)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.25)" }}>Recorriendo · Living</span>
          </div>
          <div style={{ position: "absolute", top: 18, right: 18, padding: "6px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600, color: "#fff", background: "rgba(0,0,0,0.28)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}>1080p · Lumina</div>
          <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: 72, height: 72, borderRadius: "50%", background: "rgba(255,255,255,0.9)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 14px 34px -10px rgba(0,0,0,0.55)" }}>
            <div style={{ width: 0, height: 0, borderLeft: "22px solid #9a83bf", borderTop: "13px solid transparent", borderBottom: "13px solid transparent", marginLeft: 6 }} />
          </div>
          <div style={{ position: "absolute", left: 22, right: 22, bottom: 22 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "rgba(255,255,255,0.85)", marginBottom: 8, fontWeight: 500 }}>
              <span>Tour virtual · Depto 3 amb · Palermo</span><span>0:42</span>
            </div>
            <div style={{ height: 5, borderRadius: 3, background: "rgba(255,255,255,0.28)", overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 3, background: "linear-gradient(90deg,#d8cbed,#fff)", animation: "lumProg 14s linear infinite" }} />
            </div>
            <div style={{ display: "flex", gap: 18, marginTop: 12, fontSize: 12, color: "rgba(255,255,255,0.7)", flexWrap: "wrap" }}>
              <span>● Living</span><span>○ Cocina</span><span>○ Dormitorio</span><span>○ Balcón</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

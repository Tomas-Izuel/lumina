import Estimador from "../components/Estimador";

/* Sección "La plataforma": Estimador (líder) + Tour en video + Modelo 3D. */
export default function Productos() {
  return (
    <div id="productos" style={{ maxWidth: 1120, margin: "0 auto", padding: "40px 34px 36px", position: "relative", zIndex: 10 }}>
      <div data-reveal style={{ maxWidth: 680, margin: "0 0 44px" }}>
        <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9a90ad" }}>La plataforma</span>
        <h2 className="font-serif sec-h2" style={{ fontWeight: 400, fontSize: 48, lineHeight: 1.04, letterSpacing: "-0.018em", margin: "14px 0 14px", color: "#241f30" }}>Tres herramientas. Un mismo objetivo: vender más rápido.</h2>
        <p style={{ fontSize: 17, lineHeight: 1.55, color: "#5a5369", margin: 0, maxWidth: 540 }}>Lumina es agnóstica — se conecta a tu forma de trabajar. Empezá por el estimador y sumá el resto cuando lo necesites.</p>
      </div>

      <Estimador />

      <div className="prod-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        {/* Tour en video */}
        <div data-reveal className="prod-card" style={{ position: "relative", overflow: "hidden", borderRadius: 22, background: "rgba(255,255,255,0.6)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", border: "1px solid rgba(255,255,255,0.72)", boxShadow: "0 24px 52px -30px rgba(80,60,120,0.45)", padding: 28, display: "grid", gridTemplateColumns: "1fr 0.95fr", gap: 22, alignItems: "center" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <span style={{ width: 38, height: 38, borderRadius: 11, background: "rgba(159,182,230,0.18)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7684b0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="6 3 20 12 6 21 6 3" /></svg>
              </span>
              <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "#3d8a63", background: "rgba(95,184,138,0.14)", borderRadius: 7, padding: "5px 10px" }}>Disponible ahora</span>
            </div>
            <h3 className="font-serif" style={{ fontWeight: 400, fontSize: 25, lineHeight: 1.1, color: "#241f30", margin: "0 0 8px" }}>Tour en video</h3>
            <p style={{ fontSize: 14, lineHeight: 1.55, color: "#605971", margin: 0 }}>Subí fotos sueltas y la IA arma un recorrido cinematográfico en minutos — sin filmar ni editar.</p>
          </div>
          <div style={{ position: "relative", borderRadius: 14, overflow: "hidden", aspectRatio: "4 / 3", background: "#221d2e", boxShadow: "0 16px 34px -18px rgba(80,60,120,0.6)" }}>
            <div style={{ position: "absolute", inset: 0, animation: "lumKen 16s ease-in-out infinite" }}>
              <img src="/room-living.jpg" alt="Preview de tour en video: living" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            </div>
            <div aria-hidden style={{ position: "absolute", inset: 0, background: "linear-gradient(to top,rgba(28,23,40,0.55),transparent 55%)" }} />
            <div aria-hidden style={{ position: "absolute", left: 0, right: 0, height: 2, background: "linear-gradient(90deg,transparent,rgba(202,187,233,0.95),transparent)", boxShadow: "0 0 12px rgba(202,187,233,0.8)", animation: "lumScanY 4.5s ease-in-out infinite" }} />
            <div aria-hidden style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,0.92)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 20px -6px rgba(0,0,0,0.5)" }}>
              <div style={{ width: 0, height: 0, borderLeft: "13px solid #9a83bf", borderTop: "8px solid transparent", borderBottom: "8px solid transparent", marginLeft: 3 }} />
            </div>
            <div aria-hidden style={{ position: "absolute", left: 10, right: 10, bottom: 10, height: 3, borderRadius: 3, background: "rgba(255,255,255,0.3)", overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 3, background: "#fff", animation: "lumProg 10s linear infinite" }} />
            </div>
          </div>
        </div>

        {/* Modelo 3D · próximamente */}
        <div data-reveal className="prod-card" style={{ position: "relative", overflow: "hidden", borderRadius: 22, background: "rgba(246,244,250,0.6)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", border: "1px solid rgba(255,255,255,0.6)", boxShadow: "0 24px 52px -30px rgba(80,60,120,0.35)", padding: 28, display: "grid", gridTemplateColumns: "1fr 0.95fr", gap: 22, alignItems: "center" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <span style={{ width: 38, height: 38, borderRadius: 11, background: "rgba(197,143,180,0.16)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#b06a97" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2 3 7v10l9 5 9-5V7Z" /><path d="M12 22V12" /><path d="M3 7l9 5 9-5" /></svg>
              </span>
              <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "#b06a97", background: "rgba(197,143,180,0.16)", borderRadius: 7, padding: "5px 10px" }}>Próximamente · beta</span>
            </div>
            <h3 className="font-serif" style={{ fontWeight: 400, fontSize: 25, lineHeight: 1.1, color: "#241f30", margin: "0 0 8px" }}>Modelo 3D recorrible</h3>
            <p style={{ fontSize: 14, lineHeight: 1.55, color: "#605971", margin: 0 }}>A partir de un plano o de fotos, un modelo navegable donde el cliente recorre la propiedad a su ritmo.</p>
          </div>
          <div style={{ position: "relative", borderRadius: 14, overflow: "hidden", aspectRatio: "4 / 3", background: "#211d2c", boxShadow: "0 16px 34px -18px rgba(80,60,120,0.55)" }}>
            <div aria-hidden style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(197,143,180,0.22) 1px,transparent 1px),linear-gradient(90deg,rgba(197,143,180,0.22) 1px,transparent 1px)", backgroundSize: "26px 26px", animation: "lumGrid 14s linear infinite" }} />
            <svg viewBox="0 0 200 150" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
              <path d="M40 92 L100 66 L160 92 L100 118 Z" fill="none" stroke="rgba(230,205,222,0.85)" strokeWidth="1.6" />
              <path d="M40 92 L40 56 L100 30 L160 56 L160 92" fill="none" stroke="rgba(230,205,222,0.6)" strokeWidth="1.4" />
              <path d="M100 66 L100 30" fill="none" stroke="rgba(230,205,222,0.4)" strokeWidth="1.2" strokeDasharray="3 4" />
            </svg>
            <div aria-hidden style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,0.16)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", border: "1px solid rgba(255,255,255,0.28)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
            </div>
            <div className="font-mono" style={{ position: "absolute", left: 10, bottom: 10, fontSize: 10, color: "rgba(230,205,222,0.9)" }}>plano.pdf → modelo</div>
          </div>
        </div>
      </div>
    </div>
  );
}

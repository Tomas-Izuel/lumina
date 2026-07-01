"use client";

import { useState } from "react";

const panelWrap: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "0.92fr 1.08fr",
  gap: 40,
  alignItems: "center",
  padding: 34,
  borderRadius: 24,
  background: "rgba(255,255,255,0.5)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: "1px solid rgba(255,255,255,0.72)",
  boxShadow: "0 30px 70px -36px rgba(80,60,120,0.45)",
};
const h3: React.CSSProperties = { fontWeight: 400, fontSize: 30, lineHeight: 1.1, color: "#241f30", margin: "0 0 12px" };
const lead: React.CSSProperties = { fontSize: 15.5, lineHeight: 1.55, color: "#5d5670", margin: "0 0 22px" };

function Check({ color, bg, children }: { color: string; bg: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
      <span style={{ width: 22, height: 22, borderRadius: "50%", background: bg, color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flex: "none" }}>✓</span>
      <span style={{ fontSize: 14.5, color: "#4a4359" }}>{children}</span>
    </div>
  );
}

export default function UsageToggle() {
  const [usar, setUsar] = useState<"web" | "api">("web");

  return (
    <>
      <div data-reveal style={{ display: "flex", justifyContent: "center", marginBottom: 34 }}>
        <div role="tablist" aria-label="Forma de uso" style={{ position: "relative", display: "inline-flex", padding: 5, borderRadius: 14, background: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.85)", boxShadow: "0 10px 26px -16px rgba(80,60,120,0.45)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" }}>
          <div aria-hidden style={{ position: "absolute", top: 5, bottom: 5, left: 5, width: "calc(50% - 5px)", borderRadius: 10, background: "linear-gradient(135deg,#8f78b8,#b29fd2)", boxShadow: "0 8px 18px -8px rgba(170,152,202,0.8)", transform: usar === "web" ? "translateX(0%)" : "translateX(100%)", transition: "transform 0.38s cubic-bezier(0.4,0,0.2,1)" }} />
          <button role="tab" aria-selected={usar === "web"} onClick={() => setUsar("web")} style={{ position: "relative", zIndex: 2, border: "none", background: "transparent", cursor: "pointer", padding: "11px 30px", fontFamily: "inherit", fontSize: 15, fontWeight: 600, color: usar === "web" ? "#fff" : "#6f6885", transition: "color 0.3s" }}>Web de Lumina</button>
          <button role="tab" aria-selected={usar === "api"} onClick={() => setUsar("api")} className="font-mono" style={{ position: "relative", zIndex: 2, border: "none", background: "transparent", cursor: "pointer", padding: "11px 30px", fontSize: 14, fontWeight: 500, color: usar === "api" ? "#fff" : "#6f6885", transition: "color 0.3s" }}>API REST</button>
        </div>
      </div>

      {usar === "web" ? <WebPanel /> : <ApiPanel />}
    </>
  );
}

function WebPanel() {
  return (
    <div className="panel-grid" style={panelWrap}>
      <div>
        <div style={{ display: "inline-flex", padding: "8px 13px", borderRadius: 10, background: "rgba(210,192,232,0.18)", color: "#7a5ca8", fontSize: 13, fontWeight: 600, marginBottom: 18 }}>Web de Lumina · sin código</div>
        <h3 className="font-serif" style={h3}>Para tu equipo de ventas</h3>
        <p style={lead}>Estimá valores, generá tours y gestioná tus propiedades desde el navegador. Sin instalar nada. Cualquiera en la inmobiliaria lo usa en minutos.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 26 }}>
          <Check color="#9a83bf" bg="rgba(154,131,191,0.14)">Estimación de valor con solo la dirección</Check>
          <Check color="#9a83bf" bg="rgba(154,131,191,0.14)">Tours de video por arrastrar y soltar</Check>
          <Check color="#9a83bf" bg="rgba(154,131,191,0.14)">Publicá directo a portales y redes</Check>
        </div>
        <a href="#wl" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "13px 22px", borderRadius: 12, background: "linear-gradient(135deg,#8f78b8,#b29fd2)", color: "#fff", fontSize: 15, fontWeight: 600, textDecoration: "none", boxShadow: "0 14px 30px -12px rgba(170,152,202,0.85)" }}>
          Probar la web <span style={{ fontSize: 17 }}>→</span>
        </a>
      </div>

      <div style={{ borderRadius: 16, overflow: "hidden", background: "#fbf8fd", border: "1px solid rgba(120,90,160,0.14)", boxShadow: "0 24px 50px -28px rgba(80,60,120,0.5)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "11px 16px", borderBottom: "1px solid rgba(120,90,160,0.1)", background: "rgba(255,255,255,0.6)" }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#efdde5" }} />
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#d9cbe8" }} />
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#c9d6f0" }} />
          <span style={{ margin: "0 auto", fontSize: 12, color: "#9a90ad", background: "#fff", borderRadius: 7, padding: "4px 14px", border: "1px solid rgba(120,90,160,0.1)" }}>app.lumina.ai/propiedad</span>
        </div>
        <div style={{ padding: 22 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#3d3650" }}>Depto 3 amb · Providencia</span>
            <span style={{ fontSize: 12, color: "#5fb88a", fontWeight: 600, background: "rgba(95,184,138,0.13)", borderRadius: 6, padding: "3px 9px" }}>Estimado ✓</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginBottom: 16 }}>
            <div style={{ borderRadius: 11, padding: 12, background: "rgba(154,131,191,0.1)" }}>
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.03em", color: "#8b7cae", marginBottom: 5 }}>Venta</div>
              <div className="font-serif" style={{ fontSize: 21, color: "#241f30", lineHeight: 1 }}>$ 265M</div>
            </div>
            <div style={{ borderRadius: 11, padding: 12, background: "rgba(159,182,230,0.13)" }}>
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.03em", color: "#7684b0", marginBottom: 5 }}>Arriendo</div>
              <div className="font-serif" style={{ fontSize: 21, color: "#241f30", lineHeight: 1 }}>$ 820K/mes</div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 9, marginBottom: 18 }}>
            {["/room-living.jpg", "/room-cocina.jpg", "/room-dormitorio.jpg"].map((src) => (
              <div key={src} style={{ aspectRatio: "1", borderRadius: 9, overflow: "hidden", boxShadow: "0 4px 12px -6px rgba(80,60,120,0.4)" }}>
                <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </div>
            ))}
            <div style={{ aspectRatio: "1", borderRadius: 9, border: "1.5px dashed rgba(154,131,191,0.4)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, color: "#b29ad0" }}>
              <span style={{ fontSize: 20, lineHeight: 1 }}>+</span>
              <span style={{ fontSize: 9 }}>soltar</span>
            </div>
          </div>
          <button style={{ width: "100%", padding: 13, border: "none", borderRadius: 11, background: "linear-gradient(135deg,#8f78b8,#b29fd2)", color: "#fff", fontSize: 14.5, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", boxShadow: "0 12px 26px -12px rgba(170,152,202,0.8)" }}>Generar tour virtual</button>
        </div>
      </div>
    </div>
  );
}

function ApiPanel() {
  return (
    <div className="panel-grid" style={panelWrap}>
      <div>
        <div className="font-mono" style={{ display: "inline-flex", padding: "8px 13px", borderRadius: 10, background: "rgba(192,202,234,0.28)", color: "#7684b0", fontSize: 13, fontWeight: 600, marginBottom: 18 }}>API REST · developers</div>
        <h3 className="font-serif" style={h3}>Integralo en tu CRM o portal</h3>
        <p style={lead}>Pedí una estimación con una dirección, o un tour con imágenes ordenadas — y recibí la respuesta por webhook. Automatizá a escala desde tu propio sistema.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 26 }}>
          <Check color="#7684b0" bg="rgba(118,132,176,0.16)">Endpoints de estimación y de tours</Check>
          <Check color="#7684b0" bg="rgba(118,132,176,0.16)">Webhooks de estado en tiempo real</Check>
          <Check color="#7684b0" bg="rgba(118,132,176,0.16)">SDKs para Node y Python</Check>
        </div>
        <a href="#wl" className="font-mono" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "13px 22px", borderRadius: 12, background: "#241f30", color: "#fff", fontSize: 15, fontWeight: 600, textDecoration: "none", boxShadow: "0 14px 30px -14px rgba(36,31,48,0.8)" }}>Ver documentación →</a>
      </div>

      <div>
        <div className="font-mono" style={{ borderRadius: 14, overflow: "hidden", background: "#221d2e", fontSize: 12.5, lineHeight: 1.7, boxShadow: "0 24px 50px -28px rgba(36,31,48,0.7)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <span style={{ padding: "2px 8px", borderRadius: 6, background: "#5fb88a", color: "#0e2a1c", fontSize: 11, fontWeight: 600 }}>POST</span>
            <span style={{ color: "#c9bce0" }}>/v1/estimates</span>
            <span style={{ marginLeft: "auto", color: "#6f6685", fontSize: 11 }}>curl</span>
          </div>
          <div style={{ padding: "15px 18px", color: "#cfc6dd" }}>
            <span style={{ color: "#8d83a3" }}>{"{"}</span><br />
            &nbsp;&nbsp;<span style={{ color: "#cabbe9" }}>&quot;address&quot;</span>: <span style={{ color: "#9ad0b0" }}>&quot;Av. Providencia 2140&quot;</span>,<br />
            &nbsp;&nbsp;<span style={{ color: "#cabbe9" }}>&quot;area_m2&quot;</span>: <span style={{ color: "#e6b98a" }}>92</span>,<br />
            &nbsp;&nbsp;<span style={{ color: "#cabbe9" }}>&quot;bedrooms&quot;</span>: <span style={{ color: "#e6b98a" }}>3</span><br />
            <span style={{ color: "#8d83a3" }}>{"}"}</span><br />
            <span style={{ color: "#5f586f" }}>→ 200 {"{"} sale: 265000000, rent: 820000, currency: &quot;CLP&quot;, confidence: 0.72 {"}"}</span>
          </div>
        </div>
        <div style={{ position: "relative", marginTop: 16, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 16px", borderRadius: 14, background: "#fbf8fd", border: "1px solid rgba(120,90,160,0.12)", overflow: "hidden" }}>
          <div style={{ position: "absolute", left: 16, right: 16, top: "50%", height: 2, background: "linear-gradient(90deg,transparent,rgba(154,131,191,0.3),transparent)" }} />
          <div style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", width: 9, height: 9, borderRadius: "50%", background: "#9a83bf", boxShadow: "0 0 10px rgba(154,131,191,0.8)", animation: "lumPacket 3.4s ease-in-out infinite" }} />
          <Step label="request"><span style={{ width: 15, height: 15, borderRadius: 4, background: "#9a83bf" }} /></Step>
          <Step label="IA"><span style={{ width: 15, height: 15, border: "2px solid #9a83bf", borderTopColor: "transparent", borderRadius: "50%", animation: "lumSpin 1.2s linear infinite" }} /></Step>
          <Step label="valor + rango"><span style={{ width: 15, height: 15, borderRadius: 4, background: "#5fb88a" }} /></Step>
        </div>
      </div>
    </div>
  );
}

function Step({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, background: "#fbf8fd", padding: "0 8px" }}>
      {children}
      <span className="font-mono" style={{ fontSize: 11, color: "#7a7388", fontWeight: 600 }}>{label}</span>
    </div>
  );
}

"use client";

import { useEffect, useRef } from "react";

/* Estimador de valor — port del rAF loop `_initEstimador` de Lumina.dc.html.
   Anima (en loop de ~14s) el typewriter de la dirección, la interpolación de
   valores venta/arriendo, la barra de precisión, las chips de datos del broker
   y la aparición de comparables + pins en el mapa. Scopea todo a un rootRef. */

const ADDR = "Av. Providencia 2140, Depto 802";
// valores en pesos chilenos (CLP): venta ~CLP $265M, arriendo ~CLP $820k/mes
const K = [
  { t: 1.7, v: 236000000, r: 742000, p: 44 },
  { t: 3.3, v: 252000000, r: 790000, p: 59 },
  { t: 4.9, v: 261000000, r: 808000, p: 70 },
  { t: 6.4, v: 265000000, r: 817000, p: 77 },
  { t: 9.0, v: 266000000, r: 820000, p: 85 },
  { t: 10.8, v: 265000000, r: 820000, p: 87 },
];
const CHIP_T = [3.1, 4.7, 6.2, 8.6];
const CYCLE = 14;

const fmt = (n: number) => {
  n = Math.round(n / 100) * 100;
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

const dot: React.CSSProperties = { width: 15, height: 15, borderRadius: "50%", background: "#9fb6e6", border: "2.5px solid #fff", boxShadow: "0 4px 10px -3px rgba(80,60,120,0.5)" };
const cmpRow: React.CSSProperties = { opacity: 0, transform: "translateY(6px)", transition: "opacity 0.5s, transform 0.5s", display: "flex", alignItems: "center", gap: 11, padding: 8, borderRadius: 12, background: "rgba(255,255,255,0.72)", border: "1px solid rgba(255,255,255,0.9)", boxShadow: "0 8px 20px -14px rgba(80,60,120,0.5)" };

type Comp = { img: string; addr: string; specs: string; price: string; deal: "Vendido" | "Arrendado"; ago: string };
const COMPS: Comp[] = [
  { img: "/room-cocina.jpg", addr: "Av. Providencia 2088", specs: "2 amb · 88 m² · 1 baño", price: "$ 252.000.000", deal: "Vendido", ago: "hace 2 m" },
  { img: "/room-dormitorio.jpg", addr: "Los Leones 145", specs: "3 amb · 95 m² · 2 baños", price: "$ 278.000.000", deal: "Vendido", ago: "hace 1 m" },
  { img: "/room-balcon.jpg", addr: "Marchant Pereira 320", specs: "3 amb · 90 m² · 2 baños", price: "$ 820.000/mes", deal: "Arrendado", ago: "hace 3 sem" },
];
const dealStyle = (deal: Comp["deal"]): React.CSSProperties =>
  deal === "Vendido"
    ? { color: "#3d8a63", background: "rgba(95,184,138,0.16)" }
    : { color: "#7684b0", background: "rgba(159,182,230,0.2)" };
const chipBase: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600, borderRadius: 999, padding: "6px 12px", border: "1px dashed rgba(154,131,191,0.35)", background: "rgba(154,131,191,0.08)", color: "#9a83bf", opacity: 0.4, transition: "all 0.4s" };

export default function Estimador() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const q = (n: string) => root.querySelector<HTMLElement>(`[data-est="${n}"]`);
    const addr = q("addr"), spin = q("spin"), status = q("status"),
      venta = q("venta"), arr = q("arriendo"), prec = q("prec"),
      precbar = q("precbar"), pin = q("pin"), valwrap = q("valwrap");
    const chips = Array.from(root.querySelectorAll<HTMLElement>('[data-est="chip"]'));
    const comps = Array.from(root.querySelectorAll<HTMLElement>('[data-est="cmp"]'));
    const marks = Array.from(root.querySelectorAll<HTMLElement>('[data-est="comp"]'));

    const paint = (lt: number) => {
      if (lt < 1.7) {
        const pr = Math.max(0, (lt - 0.3) / 1.4);
        if (addr) addr.textContent = ADDR.slice(0, Math.floor(pr * ADDR.length));
      } else if (addr) addr.textContent = ADDR;

      const shown = lt >= 1.7;
      if (valwrap) valwrap.style.opacity = shown ? "1" : "0";
      if (pin) {
        pin.style.opacity = shown ? "1" : "0";
        pin.style.transform = shown ? "translate(-50%,-70%) scale(1)" : "translate(-50%,-55%) scale(0.6)";
      }
      if (shown) {
        let a = K[0], b = K[0];
        if (lt <= K[0].t) a = b = K[0];
        else if (lt >= K[K.length - 1].t) a = b = K[K.length - 1];
        else for (let i = 0; i < K.length - 1; i++) if (lt >= K[i].t && lt < K[i + 1].t) { a = K[i]; b = K[i + 1]; break; }
        const u = b.t === a.t ? 1 : (lt - a.t) / (b.t - a.t);
        const v = a.v + (b.v - a.v) * u, r = a.r + (b.r - a.r) * u, p = a.p + (b.p - a.p) * u;
        if (venta) venta.textContent = "$ " + fmt(v);
        if (arr) arr.textContent = "$ " + fmt(r);
        if (prec) prec.textContent = Math.round(p) + "%";
        if (precbar) precbar.style.width = p + "%";
      } else {
        if (venta) venta.textContent = "$ —";
        if (arr) arr.textContent = "$ —";
        if (prec) prec.textContent = "—";
        if (precbar) precbar.style.width = "0%";
      }

      chips.forEach((c, i) => {
        const active = lt > CHIP_T[i];
        c.style.opacity = active ? "1" : "0.4";
        c.style.background = active ? "rgba(95,184,138,0.14)" : "rgba(154,131,191,0.08)";
        c.style.borderColor = active ? "transparent" : "rgba(154,131,191,0.35)";
        c.style.color = active ? "#3d8a63" : "#9a83bf";
        const chk = c.querySelector<HTMLElement>("[data-chk]");
        if (chk) chk.style.display = active ? "inline" : "none";
      });
      // las propiedades similares aparecen temprano: son la base de la tasación
      comps.forEach((c, i) => {
        const active = lt > 4.6 + i * 0.4;
        c.style.opacity = active ? "1" : "0";
        c.style.transform = active ? "none" : "translateY(6px)";
      });
      marks.forEach((m, i) => {
        const active = lt > 4.6 + i * 0.35;
        m.style.opacity = active ? "1" : "0";
        m.style.transform = active ? "translate(-50%,-50%) scale(1)" : "translate(-50%,-50%) scale(0)";
      });

      let st = "Buscando dirección…", spinning = false;
      if (lt >= 1.7 && lt < 3.1) st = "Estimación inicial";
      else if (lt >= 3.1 && lt < 4.6) { st = "Sumando tus datos…"; spinning = true; }
      else if (lt >= 4.6 && lt < 6.4) { st = "Buscando propiedades similares…"; spinning = true; }
      else if (lt >= 6.4 && lt < 8.9) { st = "Comparando con similares…"; spinning = true; }
      else if (lt >= 8.9 && lt < 10.8) { st = "Afinando el valor…"; spinning = true; }
      else if (lt >= 10.8) st = "Estimación afinada ✓";
      if (status) status.textContent = st;
      if (spin) spin.style.opacity = spinning ? "1" : "0";
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      paint(11.5); // estado final estable
      return;
    }

    let raf = 0;
    const t0 = performance.now();
    const tick = () => {
      raf = requestAnimationFrame(tick);
      paint(((performance.now() - t0) / 1000) % CYCLE);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div ref={rootRef} data-reveal style={{ position: "relative", overflow: "hidden", borderRadius: 22, background: "rgba(255,255,255,0.62)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", border: "1px solid rgba(255,255,255,0.72)", boxShadow: "0 24px 52px -30px rgba(80,60,120,0.45)", marginBottom: 18 }}>
      <div className="est-grid" style={{ display: "grid", gridTemplateColumns: "0.92fr 1.08fr" }}>
        {/* LEFT: mapa + comparables */}
        <div style={{ position: "relative", display: "flex", flexDirection: "column", background: "linear-gradient(160deg,#edebf6,#e7e4f2)", borderRight: "1px solid rgba(120,90,160,0.1)" }}>
          <div style={{ position: "relative", flex: 1, minHeight: 210, overflow: "hidden" }}>
            <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
              <rect width="400" height="300" fill="#eceaf5" />
              <g fill="#e1dcef">
                <rect x="14" y="14" width="150" height="104" rx="9" />
                <rect x="182" y="14" width="118" height="66" rx="9" />
                <rect x="318" y="14" width="68" height="104" rx="9" />
                <rect x="14" y="140" width="88" height="146" rx="9" />
                <rect x="120" y="140" width="180" height="66" rx="9" />
                <rect x="120" y="222" width="180" height="64" rx="9" />
                <rect x="318" y="140" width="68" height="146" rx="9" />
                <rect x="182" y="96" width="118" height="26" rx="7" />
              </g>
              <g stroke="#f5f3fb" strokeWidth="8" strokeLinecap="round" opacity="0.95">
                <path d="M0 130 H400" /><path d="M110 0 V300" /><path d="M310 0 V300" /><path d="M172 130 V300" />
              </g>
              <g stroke="#dcd6ec" strokeWidth="1.4" strokeDasharray="2 6" opacity="0.9">
                <path d="M0 130 H400" /><path d="M110 0 V300" /><path d="M310 0 V300" />
              </g>
            </svg>

            <div data-est="comp" style={{ position: "absolute", left: "27%", top: "31%", ...dot, opacity: 0, transform: "translate(-50%,-50%) scale(0)", transition: "opacity 0.5s, transform 0.5s cubic-bezier(0.3,1.4,0.5,1)" }} />
            <div data-est="comp" style={{ position: "absolute", left: "74%", top: "41%", ...dot, opacity: 0, transform: "translate(-50%,-50%) scale(0)", transition: "opacity 0.5s, transform 0.5s cubic-bezier(0.3,1.4,0.5,1)" }} />
            <div data-est="comp" style={{ position: "absolute", left: "41%", top: "75%", ...dot, opacity: 0, transform: "translate(-50%,-50%) scale(0)", transition: "opacity 0.5s, transform 0.5s cubic-bezier(0.3,1.4,0.5,1)" }} />

            <div data-est="pin" style={{ position: "absolute", left: "52%", top: "52%", transform: "translate(-50%,-70%) scale(0.6)", opacity: 0, transition: "opacity 0.5s ease, transform 0.6s cubic-bezier(0.3,1.5,0.5,1)" }}>
              <div aria-hidden style={{ position: "absolute", left: "50%", top: "100%", transform: "translate(-50%,-50%)", width: 46, height: 46, borderRadius: "50%", background: "rgba(154,131,191,0.28)", animation: "lumRing 2.4s ease-out infinite" }} />
              <svg width="34" height="34" viewBox="0 0 24 24" fill="#9a83bf" stroke="#fff" strokeWidth="1.4" style={{ filter: "drop-shadow(0 6px 8px rgba(80,60,120,0.5))", position: "relative" }}>
                <path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7Z" />
                <circle cx="12" cy="9" r="2.4" fill="#fff" stroke="none" />
              </svg>
            </div>

            <div style={{ position: "absolute", left: 14, top: 14, display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 12px", borderRadius: 10, background: "rgba(255,255,255,0.88)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", boxShadow: "0 8px 20px -12px rgba(80,60,120,0.5)", fontSize: 11.5, fontWeight: 600, color: "#574c6b" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#9a83bf" }} />Providencia, RM
            </div>
          </div>

          <div style={{ padding: "15px 18px 17px", background: "rgba(255,255,255,0.55)", borderTop: "1px solid rgba(120,90,160,0.1)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "#9a90ad" }}>Propiedades similares</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#7684b0", background: "rgba(159,182,230,0.18)", borderRadius: 6, padding: "2px 7px" }}>base de la tasación</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {COMPS.map((c) => (
                <div key={c.addr} data-est="cmp" style={cmpRow}>
                  <img src={c.img} alt="" style={{ width: 46, height: 40, borderRadius: 9, objectFit: "cover", flex: "none", boxShadow: "0 4px 10px -5px rgba(80,60,120,0.55)" }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: "#3d3650", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.addr}</div>
                    <div style={{ fontSize: 11, color: "#8a8299", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.specs}</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3, flex: "none" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#241f30" }}>{c.price}</span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 9.5, fontWeight: 700, borderRadius: 5, padding: "2px 6px", ...dealStyle(c.deal) }}>
                      {c.deal} · {c.ago}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: panel */}
        <div style={{ padding: "28px 30px", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <span style={{ width: 38, height: 38, borderRadius: 11, background: "rgba(154,131,191,0.14)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9a83bf" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 17l6-6 4 4 8-8" /><path d="M17 7h4v4" /></svg>
            </span>
            <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "#3d8a63", background: "rgba(95,184,138,0.14)", borderRadius: 7, padding: "5px 10px" }}>Disponible ahora</span>
          </div>
          <h3 className="font-serif" style={{ fontWeight: 400, fontSize: 27, lineHeight: 1.1, color: "#241f30", margin: "0 0 8px" }}>Estimador de valor</h3>
          <p style={{ fontSize: 14, lineHeight: 1.55, color: "#605971", margin: "0 0 18px" }}>Escribí una dirección y obtené el valor al instante. Cada dato que sumás afina la estimación con comparables reales.</p>

          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", borderRadius: 12, background: "#fff", border: "1px solid rgba(120,90,160,0.16)", boxShadow: "inset 0 2px 5px -3px rgba(80,60,120,0.25)", marginBottom: 11 }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#9a83bf" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none" }}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
            <span data-est="addr" style={{ fontSize: 13.5, color: "#2a2433", fontWeight: 500, flex: 1, whiteSpace: "nowrap", overflow: "hidden" }} />
            <span data-est="caret" style={{ width: 2, height: 15, background: "#9a83bf", borderRadius: 1, animation: "lumBlink 1s steps(1) infinite", flex: "none" }} />
            <span data-est="spin" style={{ width: 15, height: 15, border: "2px solid #9a83bf", borderTopColor: "transparent", borderRadius: "50%", animation: "lumSpin 1s linear infinite", opacity: 0, transition: "opacity 0.3s", flex: "none" }} />
          </div>
          <div data-est="status" style={{ fontSize: 12, color: "#8a8299", fontWeight: 600, marginBottom: 16, height: 15 }}>Buscando dirección…</div>

          <div data-est="valwrap" style={{ opacity: 0, transition: "opacity 0.5s ease", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div style={{ borderRadius: 13, padding: "14px 15px", background: "linear-gradient(160deg,rgba(154,131,191,0.13),rgba(202,187,233,0.09))", border: "1px solid rgba(154,131,191,0.18)" }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.03em", textTransform: "uppercase", color: "#8b7cae", marginBottom: 6 }}>Valor de venta</div>
              <div data-est="venta" className="font-serif" style={{ fontSize: 26, color: "#241f30", lineHeight: 1, letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>$ —</div>
            </div>
            <div style={{ borderRadius: 13, padding: "14px 15px", background: "linear-gradient(160deg,rgba(159,182,230,0.15),rgba(192,202,234,0.09))", border: "1px solid rgba(159,182,230,0.2)" }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.03em", textTransform: "uppercase", color: "#7684b0", marginBottom: 6 }}>Arriendo / mes</div>
              <div data-est="arriendo" className="font-serif" style={{ fontSize: 26, color: "#241f30", lineHeight: 1, letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>$ —</div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#4a4359" }}>Precisión de la estimación</span>
            <span data-est="prec" className="font-mono" style={{ fontSize: 13, fontWeight: 500, color: "#9a83bf" }}>—</span>
          </div>
          <div style={{ height: 7, borderRadius: 5, background: "rgba(120,90,160,0.12)", overflow: "hidden", marginBottom: 18 }}>
            <div data-est="precbar" style={{ height: "100%", borderRadius: 5, background: "linear-gradient(90deg,#b29fd2,#9a83bf)", width: "0%", transition: "width 0.5s ease" }} />
          </div>

          <div style={{ marginTop: "auto" }}>
            <div style={{ fontSize: 12, color: "#8a8299", marginBottom: 10 }}>Datos que suma el broker →</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {["92 m²", "3 habitaciones", "2 baños", "Cochera"].map((label) => (
                <span key={label} data-est="chip" style={chipBase}>
                  {label} <span data-chk style={{ display: "none", fontSize: 11 }}>✓</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

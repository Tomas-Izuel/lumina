"use client";

import { useState } from "react";

export default function Waitlist() {
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "15px 24px", borderRadius: 13, background: "rgba(95,184,138,0.16)", color: "#3d8a63", fontSize: 16, fontWeight: 600 }}>
        <span style={{ width: 22, height: 22, borderRadius: "50%", background: "#5fb88a", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>✓</span>
        ¡Listo! Te avisamos apenas abramos el acceso.
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setDone(true);
      }}
      style={{ display: "flex", gap: 10, maxWidth: 460, margin: "0 auto", flexWrap: "wrap", justifyContent: "center" }}
    >
      <input
        type="email"
        required
        placeholder="tu@inmobiliaria.com"
        aria-label="Tu email"
        style={{ flex: 1, minWidth: 220, padding: "15px 18px", borderRadius: 13, border: "1px solid rgba(120,90,160,0.2)", background: "rgba(255,255,255,0.8)", fontSize: 16, fontFamily: "inherit", color: "#2a2433", outline: "none" }}
      />
      <button type="submit" style={{ padding: "15px 26px", border: "none", borderRadius: 13, background: "linear-gradient(135deg,#8f78b8,#b29fd2)", color: "#fff", fontSize: 16, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", boxShadow: "0 14px 30px -12px rgba(170,152,202,0.85)" }}>
        Sumarme
      </button>
    </form>
  );
}

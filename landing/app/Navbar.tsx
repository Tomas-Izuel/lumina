"use client";

import { useEffect, useState } from "react";

const NAV_LINKS = [
  { href: "#productos", label: "Productos" },
  { href: "#flujo", label: "Cómo funciona" },
  { href: "#usar", label: "API & Web" },
  { href: "#sobre", label: "Lumina" },
];

/**
 * Nav fija arriba. Al scrollear intensifica el glassmorphism (más blur, más
 * opacidad y sombra marcada). El pill flota con un pequeño margen superior.
 */
export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, padding: "14px 34px 0", pointerEvents: "none" }}>
      <nav
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          pointerEvents: "auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 24,
          padding: scrolled ? "13px 22px" : "16px 22px",
          borderRadius: 18,
          background: scrolled ? "rgba(255,255,255,0.82)" : "rgba(255,255,255,0.5)",
          backdropFilter: `blur(${scrolled ? 26 : 14}px) saturate(1.6)`,
          WebkitBackdropFilter: `blur(${scrolled ? 26 : 14}px) saturate(1.6)`,
          border: `1px solid ${scrolled ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.6)"}`,
          boxShadow: scrolled
            ? "0 18px 44px -20px rgba(80,60,120,0.6)"
            : "0 14px 38px -26px rgba(80,60,120,0.35)",
          transition: "background 0.3s ease, box-shadow 0.3s ease, padding 0.3s ease, backdrop-filter 0.3s ease, border-color 0.3s ease",
        }}
      >
        <a href="#" aria-label="Lumina — inicio" style={{ display: "flex", alignItems: "center", gap: 11, textDecoration: "none" }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: "linear-gradient(135deg,#ccbde9,#efdde5)", boxShadow: "0 6px 16px -6px rgba(170,152,202,0.7)", position: "relative" }}>
            <div style={{ position: "absolute", inset: 8, borderRadius: "50%", background: "rgba(255,255,255,0.92)" }} />
          </div>
          <span style={{ fontSize: 21, fontWeight: 600, letterSpacing: "-0.01em", color: "#2a2433" }}>Lumina</span>
        </a>
        <div className="nav-links" style={{ display: "flex", alignItems: "center", gap: 28, fontSize: 15, color: "#564f63" }}>
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} style={{ color: "inherit", textDecoration: "none" }}>{l.label}</a>
          ))}
        </div>
        <a href="#wl" style={{ display: "inline-flex", alignItems: "center", padding: "10px 18px", borderRadius: 11, background: "linear-gradient(135deg,#8f78b8,#b29fd2)", color: "#fff", fontSize: 15, fontWeight: 600, textDecoration: "none", boxShadow: "0 10px 24px -10px rgba(170,152,202,0.8)" }}>Sumarme a la waitlist</a>
      </nav>
    </div>
  );
}

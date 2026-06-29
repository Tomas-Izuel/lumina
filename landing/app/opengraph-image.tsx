import { ImageResponse } from "next/og";

export const alt = "Lumina — Recorridos virtuales con IA";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// OG branded generada en build (estática). Estética alineada a la landing.
export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "90px",
          background:
            "radial-gradient(900px 600px at 80% -10%, #4c1d95 0%, transparent 60%), linear-gradient(135deg, #160d20 0%, #0b0710 100%)",
          color: "#f5f3ff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 22, fontSize: 44, fontWeight: 800 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "linear-gradient(135deg, #a78bfa, #38bdf8)",
              display: "flex",
            }}
          />
          Lumina
        </div>
        <div
          style={{
            marginTop: 40,
            fontSize: 84,
            fontWeight: 800,
            letterSpacing: "-0.03em",
            lineHeight: 1.05,
            maxWidth: 900,
          }}
        >
          Tus propiedades, en movimiento.
        </div>
        <div style={{ marginTop: 28, fontSize: 38, color: "#c4b5fd", maxWidth: 820 }}>
          De las fotos a un recorrido virtual cinematográfico, con IA.
        </div>
      </div>
    ),
    { ...size }
  );
}

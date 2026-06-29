import { ImageResponse } from "next/og";

export const alt = "Lumina — Tours virtuales con IA para real estate";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

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
            "radial-gradient(800px 500px at 85% -10%, #d8cbed 0%, transparent 60%), linear-gradient(168deg, #f2ecf8 0%, #ecedfa 50%, #efedf9 100%)",
          color: "#241f30",
          fontFamily: "serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 40, fontWeight: 700, fontFamily: "sans-serif" }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg, #ccbde9, #efdde5)", display: "flex" }} />
          Lumina
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", marginTop: 44, fontSize: 84, letterSpacing: "-0.02em", lineHeight: 1.05, maxWidth: 940 }}>
          <span>Fotos sueltas, un&nbsp;</span>
          <span style={{ color: "#9a83bf", fontStyle: "italic" }}>tour que vende.</span>
        </div>
        <div style={{ marginTop: 28, fontSize: 34, color: "#5a5369", maxWidth: 820, fontFamily: "sans-serif" }}>
          Tours virtuales en video, generados con IA. Sin filmar, sin editar.
        </div>
      </div>
    ),
    { ...size }
  );
}

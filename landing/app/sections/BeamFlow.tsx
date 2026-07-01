/* El flujo — "Un motor, muchas salidas".
   Todo el diagrama vive en UN solo SVG con viewBox uniforme
   (preserveAspectRatio por defecto = xMidYMid meet): nodos, curvas y
   partículas comparten el mismo sistema de coordenadas, así siempre quedan
   alineados y las partículas no se deforman. Animación por SMIL (sin JS). */

type IconProps = { color: string };

const ICONS: Record<string, (p: IconProps) => React.ReactNode> = {
  address: ({ color }) => (
    <g fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" />
    </g>
  ),
  photos: ({ color }) => (
    <g fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.6-3.6a2 2 0 0 0-2.8 0L6 21" />
    </g>
  ),
  plan: ({ color }) => (
    <g fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /><path d="M9 21V9" />
    </g>
  ),
  value: ({ color }) => (
    <g fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 17l6-6 4 4 8-8" /><path d="M17 7h4v4" />
    </g>
  ),
  play: ({ color }) => (
    <g fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="6 3 20 12 6 21 6 3" />
    </g>
  ),
  cube: ({ color }) => (
    <g fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2 3 7v10l9 5 9-5V7Z" /><path d="M12 22V12" /><path d="M3 7l9 5 9-5" />
    </g>
  ),
};

type NodeDef = { cx: number; cy: number; icon: keyof typeof ICONS; color: string; label: string; soon?: boolean };

const INPUTS: NodeDef[] = [
  { cx: 130, cy: 90, icon: "address", color: "#9a83bf", label: "Dirección" },
  { cx: 130, cy: 220, icon: "photos", color: "#9a83bf", label: "Fotos" },
  { cx: 130, cy: 350, icon: "plan", color: "#9a83bf", label: "Plano" },
];
const OUTPUTS: NodeDef[] = [
  { cx: 870, cy: 90, icon: "value", color: "#9a83bf", label: "Valor estimado" },
  { cx: 870, cy: 220, icon: "play", color: "#7684b0", label: "Tour en video" },
  { cx: 870, cy: 350, icon: "cube", color: "#b06a97", label: "Modelo 3D", soon: true },
];

const HUB = { cx: 500, cy: 220 };
const R = 30; // radio de nodo

// curvas centro-a-centro; los nodos se pintan encima y tapan los extremos
const PATHS = [
  { id: "bf1", d: `M${INPUTS[0].cx} ${INPUTS[0].cy} C 330 ${INPUTS[0].cy}, 360 ${HUB.cy}, ${HUB.cx} ${HUB.cy}`, grad: "bgIn" },
  { id: "bf2", d: `M${INPUTS[1].cx} ${INPUTS[1].cy} C 320 ${INPUTS[1].cy}, 360 ${HUB.cy}, ${HUB.cx} ${HUB.cy}`, grad: "bgIn" },
  { id: "bf3", d: `M${INPUTS[2].cx} ${INPUTS[2].cy} C 330 ${INPUTS[2].cy}, 360 ${HUB.cy}, ${HUB.cx} ${HUB.cy}`, grad: "bgIn" },
  { id: "bf4", d: `M${HUB.cx} ${HUB.cy} C 640 ${HUB.cy}, 670 ${OUTPUTS[0].cy}, ${OUTPUTS[0].cx} ${OUTPUTS[0].cy}`, grad: "bgV" },
  { id: "bf5", d: `M${HUB.cx} ${HUB.cy} C 660 ${HUB.cy}, 640 ${OUTPUTS[1].cy}, ${OUTPUTS[1].cx} ${OUTPUTS[1].cy}`, grad: "bgT" },
  { id: "bf6", d: `M${HUB.cx} ${HUB.cy} C 640 ${HUB.cy}, 670 ${OUTPUTS[2].cy}, ${OUTPUTS[2].cx} ${OUTPUTS[2].cy}`, grad: "bgD" },
];
// (delay) por curva — escalonado para que el flujo se sienta continuo
const PULSE_DELAY = [0, 0.35, 0.7, 1.05, 1.4, 1.75];

const textStyle: React.CSSProperties = { fontFamily: "var(--font-sans), system-ui, sans-serif", fontSize: 13, fontWeight: 600 };

function FlowNode({ n }: { n: NodeDef }) {
  const Icon = ICONS[n.icon];
  return (
    <g>
      <circle cx={n.cx} cy={n.cy} r={R} fill="#ffffff" filter="url(#bfNode)" />
      <g transform={`translate(${n.cx} ${n.cy}) scale(0.92) translate(-12 -12)`}>
        <Icon color={n.color} />
      </g>
      {n.soon && <circle cx={n.cx + 21} cy={n.cy - 21} r={5.5} fill="#c58fb4" stroke="#fff" strokeWidth={2} />}
      <text x={n.cx} y={n.cy + R + 20} textAnchor="middle" fill="#574c6b" style={textStyle}>
        {n.label}
        {n.soon && <tspan fill="#b06a97"> · pronto</tspan>}
      </text>
    </g>
  );
}

export default function BeamFlow() {
  return (
    <div id="flujo" style={{ maxWidth: 1120, margin: "0 auto", padding: "78px 34px", position: "relative", zIndex: 10 }}>
      <div data-reveal style={{ maxWidth: 560, margin: "0 0 44px auto", textAlign: "right" }}>
        <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9a90ad" }}>Cómo funciona</span>
        <h2 className="font-serif sec-h2" style={{ fontWeight: 400, fontSize: 46, lineHeight: 1.04, letterSpacing: "-0.018em", margin: "14px 0", color: "#241f30" }}>Un motor, muchas salidas.</h2>
        <p style={{ fontSize: 17, lineHeight: 1.55, color: "#5a5369", margin: 0 }}>Entra una dirección, fotos o un plano — sale un valor estimado, un tour o un modelo 3D. Todo desde el mismo lugar.</p>
      </div>

      <div data-reveal style={{ position: "relative", borderRadius: 24, background: "rgba(255,255,255,0.5)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.72)", boxShadow: "0 30px 64px -32px rgba(80,60,120,0.45)", padding: "34px 24px" }}>
        <svg viewBox="0 0 1000 440" role="img" aria-label="Diagrama: dirección, fotos o plano entran a Lumina IA y salen como valor estimado, tour en video o modelo 3D" style={{ display: "block", width: "100%", height: "auto", overflow: "visible" }}>
          <defs>
            <linearGradient id="bgIn" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#cbb9ec" /><stop offset="100%" stopColor="#9a83bf" /></linearGradient>
            <linearGradient id="bgV" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#9a83bf" /><stop offset="100%" stopColor="#b29fd2" /></linearGradient>
            <linearGradient id="bgT" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#9a83bf" /><stop offset="100%" stopColor="#9fb6e6" /></linearGradient>
            <linearGradient id="bgD" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#9a83bf" /><stop offset="100%" stopColor="#c58fb4" /></linearGradient>
            <linearGradient id="bfHub" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#a88fd0" /><stop offset="100%" stopColor="#8567ad" /></linearGradient>
            <linearGradient id="bfMark" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#ccbde9" /><stop offset="100%" stopColor="#efdde5" /></linearGradient>
            <filter id="bfNode" x="-60%" y="-60%" width="220%" height="220%">
              <feDropShadow dx="0" dy="10" stdDeviation="9" floodColor="#503c78" floodOpacity="0.28" />
            </filter>
            <filter id="bfHubShadow" x="-80%" y="-80%" width="260%" height="260%">
              <feDropShadow dx="0" dy="14" stdDeviation="14" floodColor="#8c6ebe" floodOpacity="0.5" />
            </filter>
            <filter id="bfPulse" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="2.2" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* curvas base (tenues) */}
          {PATHS.map((p) => (
            <path key={p.id} id={p.id} d={p.d} fill="none" stroke={`url(#${p.grad})`} strokeWidth="2.5" strokeOpacity="0.28" strokeLinecap="round" />
          ))}

          {/* pulso de luz que recorre cada curva (stroke-dashoffset, pathLength=1) */}
          {PATHS.map((p, i) => (
            <path
              key={`${p.id}-pulse`}
              d={p.d}
              fill="none"
              stroke={`url(#${p.grad})`}
              strokeWidth="3.5"
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray="0.16 1.04"
              filter="url(#bfPulse)"
              style={{ animation: `lumDashFlow 2.4s linear ${PULSE_DELAY[i]}s infinite` }}
            />
          ))}

          {/* hub central */}
          <g>
            <circle cx={HUB.cx} cy={HUB.cy} r={42} fill="none" stroke="rgba(154,131,191,0.4)" strokeWidth={1.5}>
              <animate attributeName="r" values="42;62" dur="3s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.5;0" dur="3s" repeatCount="indefinite" />
            </circle>
            <circle cx={HUB.cx} cy={HUB.cy} r={42} fill="url(#bfHub)" filter="url(#bfHubShadow)" />
            <rect x={HUB.cx - 17} y={HUB.cy - 17} width={34} height={34} rx={10} fill="url(#bfMark)" />
            <circle cx={HUB.cx} cy={HUB.cy} r={7.5} fill="rgba(255,255,255,0.95)" />
            <text x={HUB.cx} y={HUB.cy + 42 + 22} textAnchor="middle" fill="#6d54a0" style={{ ...textStyle, fontWeight: 700 }}>Lumina IA</text>
          </g>

          {/* nodos */}
          {INPUTS.map((n) => <FlowNode key={n.label} n={n} />)}
          {OUTPUTS.map((n) => <FlowNode key={n.label} n={n} />)}
        </svg>
      </div>
    </div>
  );
}

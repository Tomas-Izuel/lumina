"use client";

import { useEffect, useRef, useState } from "react";
import type { LuminaHouseHandle } from "./luminaHouse.core";

/**
 * Casa 3D del hero. Carga three + el core solo en cliente (WebGL / performance.now).
 * Notifica el capítulo activo (0/1/2) al padre para sincronizar las cards.
 * Con prefers-reduced-motion muestra un fallback estático y fija el capítulo 0.
 */
export default function LuminaHouse({ onChapter }: { onChapter?: (chapter: number) => void }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setReduced(true);
      onChapter?.(0);
      return;
    }

    let handle: LuminaHouseHandle | undefined;
    let cancelled = false;
    const host = hostRef.current;
    if (!host) return;

    // import dinámico: three fuera del bundle inicial, cargado al montar el hero
    Promise.all([import("three"), import("./luminaHouse.core")])
      .then(([THREE, core]) => {
        if (cancelled || !hostRef.current) return;
        handle = core.createLuminaHouse(hostRef.current, THREE, onChapter);
      })
      .catch(() => setReduced(true));

    return () => {
      cancelled = true;
      handle?.destroy();
    };
    // onChapter es estable (useCallback en el padre); no re-montamos por él.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (reduced) {
    return (
      <div
        aria-hidden
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "radial-gradient(120% 120% at 30% 22%, rgba(203,189,233,0.5), rgba(184,196,238,0.35) 60%, transparent)",
        }}
      >
        <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="#9a83bf" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
          <path d="M12 2 3 7v10l9 5 9-5V7Z" />
          <path d="M12 22V12" />
          <path d="M3 7l9 5 9-5" />
        </svg>
      </div>
    );
  }

  return <div ref={hostRef} style={{ width: "100%", height: "100%" }} />;
}

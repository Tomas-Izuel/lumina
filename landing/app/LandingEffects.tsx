"use client";

import { useEffect } from "react";

/**
 * Porta la lógica del <script data-dc-script> del diseño Lumina.dc.html:
 *  - reveal on scroll  (data-reveal -> .is-visible)
 *  - typewriter en el h1 (data-tw -> .tw-in, secuencial)
 *  - parallax con el mouse (data-px)
 * Sin dependencias; respeta prefers-reduced-motion.
 */
export default function LandingEffects() {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let cleanupReveal: (() => void) | undefined;

    // --- reveal on scroll ---
    const reveals = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (reduce) {
      reveals.forEach((el) => el.classList.add("is-visible"));
    } else {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              (e.target as HTMLElement).classList.add("is-visible");
              io.unobserve(e.target);
            }
          });
        },
        { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
      );
      reveals.forEach((el, i) => {
        el.style.transitionDelay = `${(i % 3) * 0.08}s`;
        const r = el.getBoundingClientRect();
        if (r.top < (window.innerHeight || 800) * 0.95) {
          requestAnimationFrame(() =>
            requestAnimationFrame(() => el.classList.add("is-visible"))
          );
        } else {
          io.observe(el);
        }
      });
      // safety: nunca dejar contenido oculto
      const safety = window.setTimeout(
        () => reveals.forEach((el) => el.classList.add("is-visible")),
        2400
      );
      cleanupReveal = () => {
        io.disconnect();
        window.clearTimeout(safety);
      };
    }

    // --- typewriter ---
    const words = Array.from(document.querySelectorAll<HTMLElement>("[data-tw]"));
    let twTimer: number | undefined;
    if (reduce) {
      words.forEach((w) => w.classList.add("tw-in"));
    } else if (words.length) {
      let i = 0;
      const step = () => {
        if (i >= words.length) return;
        words[i].classList.add("tw-in");
        i++;
        twTimer = window.setTimeout(step, 150);
      };
      twTimer = window.setTimeout(step, 350);
    }

    // --- parallax ---
    const layers = Array.from(document.querySelectorAll<HTMLElement>("[data-px]"));
    let raf: number | null = null;
    let tx = 0;
    let ty = 0;
    const apply = () => {
      raf = null;
      layers.forEach((el) => {
        const p = parseFloat(el.getAttribute("data-px") || "0") || 0;
        el.style.transform = `translate(${tx * p}px, ${ty * p}px)`;
      });
    };
    const onMove = (e: MouseEvent) => {
      tx = e.clientX - window.innerWidth / 2;
      ty = e.clientY - window.innerHeight / 2;
      if (!raf) raf = requestAnimationFrame(apply);
    };
    if (!reduce && layers.length) {
      window.addEventListener("mousemove", onMove);
    }

    return () => {
      cleanupReveal?.();
      if (twTimer) window.clearTimeout(twTimer);
      window.removeEventListener("mousemove", onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return null;
}

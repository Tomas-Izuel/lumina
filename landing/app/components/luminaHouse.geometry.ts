/* Geometría interior de la casa 3D (living, cocina, dormitorio, estudio y
   detalles). Separada de luminaHouse.core.ts por tamaño/responsabilidad.
   Solo usa los helpers box/cyl/mkPlant que le inyecta el core. */
import type * as THREE_NS from "three";

export type BoxOpts = {
  x?: number; y?: number; z?: number; ry?: number;
  rough?: number; metal?: number; cast?: boolean; receive?: boolean; seg?: number;
};

export type Helpers = {
  box: (parent: THREE_NS.Object3D, w: number, h: number, d: number, color: string, opts?: BoxOpts) => THREE_NS.Mesh;
  cyl: (parent: THREE_NS.Object3D, rt: number, rb: number, h: number, color: string, opts?: BoxOpts) => THREE_NS.Mesh;
  mkPlant: (parent: THREE_NS.Object3D, x: number, z: number, scale?: number) => void;
};

/** Construye el casco + mobiliario + detalles dentro de `house`. */
export function buildInterior(house: THREE_NS.Object3D, h: Helpers) {
  const { box, cyl, mkPlant } = h;

  const W = 11, D = 8.6, wallH = 2.7, t = 0.16;
  const COL = {
    floor: "#d8c19c", floor2: "#c9b083", wall: "#efe7f4", wallBack: "#e4d9ef",
    rugA: "#dcaec2", rugB: "#aab8e4", sofa: "#8a70c2", cush: "#b6a3de",
    bed: "#f2ecf8", blanket: "#8ea3da", wood: "#c8ae86", counter: "#e9e0f2",
    cab: "#b7a5db", lamp: "#efdde5", pane: "#cfe0f5", frame: "#f6f1fa",
  };

  box(house, W, 0.4, D, COL.floor, { y: -0.2, rough: 0.95, cast: false });
  box(house, W - 0.5, 0.02, D - 0.5, COL.floor2, { y: 0.011, rough: 1, cast: false });

  box(house, W, wallH, t, COL.wallBack, { y: wallH / 2, z: -D / 2 + t / 2, rough: 0.95 });
  box(house, t, wallH, D, COL.wall, { x: -W / 2 + t / 2, y: wallH / 2, rough: 0.95 });
  box(house, W, 0.12, 0.04, "#e7ddf0", { y: 0.06, z: -D / 2 + t + 0.02, cast: false });
  box(house, 0.04, 0.12, D, "#e7ddf0", { x: -W / 2 + t + 0.02, y: 0.06, cast: false });

  const mkWindow = (x: number) => {
    box(house, 2.0, 1.5, 0.05, COL.pane, { x, y: 1.45, z: -D / 2 + t + 0.02, rough: 0.15, metal: 0.1, cast: false });
    box(house, 2.2, 0.12, 0.1, COL.frame, { x, y: 0.68, z: -D / 2 + t + 0.02, cast: false });
    box(house, 2.2, 0.12, 0.1, COL.frame, { x, y: 2.22, z: -D / 2 + t + 0.02, cast: false });
    box(house, 0.1, 1.62, 0.1, COL.frame, { x: x - 1.05, y: 1.45, z: -D / 2 + t + 0.02, cast: false });
    box(house, 0.1, 1.62, 0.1, COL.frame, { x: x + 1.05, y: 1.45, z: -D / 2 + t + 0.02, cast: false });
    box(house, 0.1, 1.62, 0.1, COL.frame, { x, y: 1.45, z: -D / 2 + t + 0.02, cast: false });
  };
  mkWindow(-2.9);
  mkWindow(2.9);

  box(house, t, 1.7, 4.0, COL.wall, { x: 0.2, y: 0.85, z: -D / 2 + 2.3, rough: 0.95 });
  box(house, 4.6, 1.7, t, COL.wall, { x: -W / 2 + 2.6, y: 0.85, z: 0.2, rough: 0.95 });

  // LIVING
  const living = -2.8, livz = 1.9;
  box(house, 3.4, 0.04, 2.4, COL.rugA, { x: living, y: 0.03, z: livz, cast: false });
  box(house, 3.0, 0.02, 2.0, "#f0dde6", { x: living, y: 0.045, z: livz, cast: false });
  const sx = -W / 2 + 0.9;
  box(house, 0.9, 0.5, 2.6, COL.sofa, { x: sx, y: 0.35, z: livz });
  box(house, 0.35, 1.0, 2.6, COL.sofa, { x: sx - 0.32, y: 0.6, z: livz });
  box(house, 0.9, 0.6, 0.3, COL.sofa, { x: sx, y: 0.6, z: livz - 1.3 });
  box(house, 0.9, 0.6, 0.3, COL.sofa, { x: sx, y: 0.6, z: livz + 1.3 });
  box(house, 0.7, 0.28, 0.85, COL.cush, { x: sx + 0.05, y: 0.62, z: livz - 0.55, rough: 0.95 });
  box(house, 0.7, 0.28, 0.85, COL.cush, { x: sx + 0.05, y: 0.62, z: livz + 0.55, rough: 0.95 });
  box(house, 0.9, 0.1, 1.3, COL.wood, { x: living + 0.7, y: 0.42, z: livz });
  cyl(house, 0.05, 0.05, 0.42, COL.wood, { x: living + 0.35, y: 0.21, z: livz - 0.5 });
  cyl(house, 0.05, 0.05, 0.42, COL.wood, { x: living + 1.05, y: 0.21, z: livz - 0.5 });
  cyl(house, 0.05, 0.05, 0.42, COL.wood, { x: living + 0.35, y: 0.21, z: livz + 0.5 });
  cyl(house, 0.05, 0.05, 0.42, COL.wood, { x: living + 1.05, y: 0.21, z: livz + 0.5 });
  mkPlant(house, living + 1.6, D / 2 - 0.9);

  // KITCHEN
  const ky = 0.45;
  box(house, 4.0, 0.9, 0.7, COL.cab, { x: -W / 2 + 2.6, y: ky, z: -D / 2 + 0.5 });
  box(house, 4.1, 0.08, 0.78, COL.counter, { x: -W / 2 + 2.6, y: 0.92, z: -D / 2 + 0.5 });
  box(house, 0.7, 0.9, 2.2, COL.cab, { x: -W / 2 + 0.5, y: ky, z: -D / 2 + 1.7 });
  box(house, 0.78, 0.08, 2.3, COL.counter, { x: -W / 2 + 0.5, y: 0.92, z: -D / 2 + 1.7 });
  box(house, 3.4, 0.7, 0.4, COL.cab, { x: -W / 2 + 2.4, y: 2.05, z: -D / 2 + 0.35 });
  box(house, 0.7, 0.04, 0.5, "#dfe6f0", { x: -W / 2 + 1.9, y: 0.97, z: -D / 2 + 0.5, rough: 0.3, cast: false });
  box(house, 0.6, 0.05, 0.6, "#3a3346", { x: -W / 2 + 3.4, y: 0.965, z: -D / 2 + 0.5, rough: 0.4, cast: false });
  mkPlant(house, -W / 2 + 0.6, -D / 2 + 3.4, 0.75);

  // BEDROOM
  const bx = 3.0, bz = -D / 2 + 1.9;
  box(house, 2.0, 0.04, 2.2, COL.rugB, { x: bx, y: 0.03, z: bz + 0.6, cast: false });
  box(house, 2.8, 0.45, 3.0, COL.bed, { x: bx, y: 0.32, z: bz });
  box(house, 2.8, 0.9, 0.2, COL.cab, { x: bx, y: 0.6, z: bz - 1.5 });
  box(house, 2.7, 0.2, 2.0, COL.blanket, { x: bx, y: 0.62, z: bz + 0.4, rough: 0.95 });
  box(house, 1.0, 0.22, 0.55, "#ffffff", { x: bx - 0.6, y: 0.66, z: bz - 1.0, rough: 1 });
  box(house, 1.0, 0.22, 0.55, "#f3eef8", { x: bx + 0.6, y: 0.66, z: bz - 1.0, rough: 1 });
  box(house, 0.6, 0.55, 0.6, COL.wood, { x: bx + 1.9, y: 0.3, z: bz - 1.2 });
  cyl(house, 0.05, 0.05, 0.5, "#cbbfe0", { x: bx + 1.9, y: 0.83, z: bz - 1.2 });
  cyl(house, 0.22, 0.16, 0.28, COL.lamp, { x: bx + 1.9, y: 1.15, z: bz - 1.2, rough: 0.6 });

  // STUDY
  const dx = 3.2, dz = 2.1;
  box(house, 2.2, 0.1, 1.0, COL.wood, { x: dx, y: 0.78, z: dz });
  cyl(house, 0.05, 0.05, 0.78, "#b9a9d6", { x: dx - 0.95, y: 0.39, z: dz - 0.4 });
  cyl(house, 0.05, 0.05, 0.78, "#b9a9d6", { x: dx + 0.95, y: 0.39, z: dz - 0.4 });
  cyl(house, 0.05, 0.05, 0.78, "#b9a9d6", { x: dx - 0.95, y: 0.39, z: dz + 0.4 });
  cyl(house, 0.05, 0.05, 0.78, "#b9a9d6", { x: dx + 0.95, y: 0.39, z: dz + 0.4 });
  box(house, 0.7, 0.1, 0.7, COL.cush, { x: dx, y: 0.5, z: dz + 0.9 });
  box(house, 0.7, 0.7, 0.1, COL.cush, { x: dx, y: 0.85, z: dz + 1.25 });
  cyl(house, 0.04, 0.04, 0.5, "#b9a9d6", { x: dx - 0.28, y: 0.25, z: dz + 0.7 });
  cyl(house, 0.04, 0.04, 0.5, "#b9a9d6", { x: dx + 0.28, y: 0.25, z: dz + 0.7 });
  box(house, 0.9, 0.55, 0.05, "#3a3346", { x: dx, y: 1.15, z: dz - 0.35, rough: 0.4, cast: false });
  cyl(house, 0.04, 0.08, 0.2, "#9a83bf", { x: dx, y: 0.9, z: dz - 0.35 });
  mkPlant(house, dx + 1.9, dz + 0.6, 1.1);

  // DETALLES: TV, heladera, lámparas, cuadros, cortinas, libros
  const C = {
    console: "#cabde0", tv: "#2c2738", screen: "#4a4160", frame: "#f4eef8",
    art1: "#c3b2e4", art2: "#9fb6e6", fridge: "#dcd3ee", bench: "#c6b6e4",
    curtain: "#e6dbef", lamp: "#efdde5", b1: "#b6a3de", b2: "#9fb6e6", b3: "#c58fb4", metal: "#a99ac6",
  };
  box(house, 0.42, 0.5, 1.9, C.console, { x: -0.02, y: 0.28, z: 1.9 });
  box(house, 0.08, 0.92, 1.5, C.tv, { x: -0.2, y: 1.15, z: 1.9, rough: 0.35, cast: false });
  box(house, 0.03, 0.78, 1.36, C.screen, { x: -0.245, y: 1.15, z: 1.9, rough: 0.2, cast: false });
  box(house, 0.3, 0.12, 0.22, C.b1, { x: 0.02, y: 0.59, z: 1.3 });
  box(house, 0.26, 0.1, 0.2, C.b2, { x: 0.02, y: 0.68, z: 1.3 });
  box(house, 0.72, 1.9, 0.72, C.fridge, { x: -W / 2 + 0.55, y: 0.75, z: -D / 2 + 3.0 });
  box(house, 0.05, 0.5, 0.06, C.metal, { x: -W / 2 + 0.18, y: 1.05, z: -D / 2 + 2.78, cast: false });
  const pend = (x: number) => {
    cyl(house, 0.015, 0.015, 0.8, C.metal, { x, y: 2.2, z: -D / 2 + 0.6, cast: false });
    cyl(house, 0.17, 0.1, 0.22, C.lamp, { x, y: 1.72, z: -D / 2 + 0.6, rough: 0.5 });
  };
  pend(-3.6);
  pend(-1.9);
  box(house, 0.86, 0.62, 0.05, C.frame, { x: -0.5, y: 1.8, z: -D / 2 + 0.19, cast: false });
  box(house, 0.72, 0.48, 0.02, C.art1, { x: -0.5, y: 1.8, z: -D / 2 + 0.22, cast: false });
  box(house, 0.05, 0.66, 1.0, C.frame, { x: -W / 2 + 0.19, y: 1.9, z: 1.9, cast: false });
  box(house, 0.02, 0.5, 0.82, C.art2, { x: -W / 2 + 0.22, y: 1.9, z: 1.9, cast: false });
  box(house, 2.0, 0.4, 0.55, C.bench, { x: 3.0, y: 0.22, z: -0.9 });
  const curtain = (x: number) => box(house, 0.16, 1.72, 0.14, C.curtain, { x, y: 1.5, z: -D / 2 + 0.24, cast: false });
  curtain(-4.05);
  curtain(-1.75);
  curtain(1.75);
  curtain(4.05);
  box(house, 0.3, 0.18, 0.24, C.b3, { x: 2.6, y: 0.92, z: 2.3 });
  box(house, 0.26, 0.14, 0.2, C.b1, { x: 2.62, y: 1.08, z: 2.3 });
  box(house, 0.4, 0.08, 0.28, C.b1, { x: -2.1, y: 0.5, z: 1.9 });
  box(house, 0.34, 0.07, 0.24, C.b2, { x: -2.05, y: 0.575, z: 1.95 });
  mkPlant(house, -0.9, 3.4, 1.3);
  cyl(house, 0.015, 0.015, 0.7, C.metal, { x: -2.1, y: 2.25, z: 1.9, cast: false });
  cyl(house, 0.2, 0.12, 0.24, C.lamp, { x: -2.1, y: 1.82, z: 1.9, rough: 0.5 });
}

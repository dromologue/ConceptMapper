import { useState, useEffect } from "react";

export type ViewportKind = "phone" | "tablet" | "desktop";

export interface Viewport {
  width: number;
  height: number;
  kind: ViewportKind;
}

/** Classify a width into a device class. Phone < 700px, tablet < 1024px. */
export function classifyWidth(width: number): ViewportKind {
  if (width < 700) return "phone";
  if (width < 1024) return "tablet";
  return "desktop";
}

function read(): Viewport {
  const width = typeof window !== "undefined" ? window.innerWidth : 1280;
  const height = typeof window !== "undefined" ? window.innerHeight : 800;
  return { width, height, kind: classifyWidth(width) };
}

/** Reactive viewport size + device class, updated on resize. */
export function useViewport(): Viewport {
  const [vp, setVp] = useState<Viewport>(read);
  useEffect(() => {
    const onResize = () => setVp(read());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return vp;
}

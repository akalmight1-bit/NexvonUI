import { useEffect, useRef } from "react";

export function GargantuaBg() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fallbackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;
    let engine: { start: () => void; dispose: () => void } | null = null;
    let observer: MutationObserver | null = null;

    const boot = window.setTimeout(() => {
      import("@/lib/gargantua/engine")
        .then(({ GargantuaEngine }) => {
          if (disposed || !canvasRef.current) return;
          engine = new GargantuaEngine(canvasRef.current);
          engine.start();

          observer = new MutationObserver(() => {
            if (canvasRef.current?.classList.contains("is-live")) {
              fallbackRef.current?.classList.add("is-dimmed");
              observer?.disconnect();
            }
          });
          observer.observe(canvasRef.current, {
            attributes: true,
            attributeFilter: ["class"],
          });
        })
        .catch(() => {
          /* WebGL unavailable — CSS fallback remains */
        });
    }, 200);

    return () => {
      disposed = true;
      window.clearTimeout(boot);
      observer?.disconnect();
      engine?.dispose();
    };
  }, []);

  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden bg-void"
      aria-hidden="true"
    >
      <div ref={fallbackRef} className="bh-fallback" />
      {/* pointer-events auto so drag/click reach the canvas */}
      <canvas
        ref={canvasRef}
        className="bh-canvas absolute inset-0 block h-full w-full pointer-events-auto"
        aria-hidden="true"
      />
      <div className="bh-scanlines pointer-events-none" />
    </div>
  );
}

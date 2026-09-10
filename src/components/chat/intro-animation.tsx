import { useCallback, useEffect, useRef, useState } from "react";
import { Logo } from "./logo";

type Particle = {
  x: number;
  y: number;
  tx: number;
  ty: number;
  size: number;
  opacity: number;
  hue: number;
  light: number;
  speed: number;
  progress: number;
};

export function IntroAnimation({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const reducedMotion = useRef(false);

  useEffect(() => {
    reducedMotion.current =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Rebuild particles on mount / resize context
    particlesRef.current = [];
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    for (let i = 0; i < 110; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 280 + 70;
      particlesRef.current.push({
        x: cx + Math.cos(angle) * radius * 2.2,
        y: cy + Math.sin(angle) * radius * 2.2,
        tx: cx + Math.cos(angle) * (Math.random() * 55 + 18),
        ty: cy + Math.sin(angle) * (Math.random() * 55 + 18),
        size: Math.random() * 2.4 + 0.5,
        opacity: 0,
        hue: 185 + Math.random() * 40, // cyan → soft blue
        light: 55 + Math.random() * 30,
        speed: Math.random() * 0.022 + 0.01,
        progress: 0,
      });
    }

    if (reducedMotion.current) {
      // Skip heavy animation — just show a static frame briefly
      ctx.fillStyle = "#090b14";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      return () => window.removeEventListener("resize", resize);
    }

    let start: number | null = null;
    const animate = (ts: number) => {
      if (start === null) start = ts;
      const elapsed = ts - start;
      const t = Math.min(elapsed / 2800, 1);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#090b14";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const midX = canvas.width / 2;
      const midY = canvas.height / 2;

      // Soft pulsing rings
      const rr = 88 + Math.sin(elapsed * 0.003) * 10;
      ctx.beginPath();
      ctx.arc(midX, midY, rr, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(127, 220, 255, ${0.28 * t})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(midX, midY, 125 + Math.sin(elapsed * 0.002) * 5, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(127, 220, 255, ${0.1 * t})`;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Particles converging
      for (const p of particlesRef.current) {
        p.progress = Math.min(p.progress + p.speed, 1);
        p.x += (p.tx - p.x) * 0.04;
        p.y += (p.ty - p.y) * 0.04;
        p.opacity = Math.min(p.progress * 2, 1) * t;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 80%, ${p.light}%, ${p.opacity})`;
        ctx.fill();
      }

      // Center glow
      const g = ctx.createRadialGradient(midX, midY, 0, midX, midY, 80);
      g.addColorStop(0, `rgba(127, 220, 255, ${0.22 * t})`);
      g.addColorStop(0.5, `rgba(127, 220, 255, ${0.07 * t})`);
      g.addColorStop(1, "rgba(127, 220, 255, 0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(midX, midY, 80, 0, Math.PI * 2);
      ctx.fill();

      if (t < 1) {
        animRef.current = requestAnimationFrame(animate);
      }
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", resize);
      if (animRef.current !== null) cancelAnimationFrame(animRef.current);
    };
  }, []);

  useEffect(() => {
    if (reducedMotion.current) {
      // Fast path for reduced motion
      const t1 = window.setTimeout(() => setPhase(4), 200);
      const t2 = window.setTimeout(onComplete, 600);
      return () => {
        window.clearTimeout(t1);
        window.clearTimeout(t2);
      };
    }

    const timers = [
      window.setTimeout(() => setPhase(1), 400),
      window.setTimeout(() => setPhase(2), 1100),
      window.setTimeout(() => setPhase(3), 1800),
      window.setTimeout(() => setPhase(4), 2500),
      window.setTimeout(onComplete, 4000),
    ];
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [onComplete]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-void"
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" />

      {/* Subtle scanlines */}
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          background:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.04) 2px, rgba(0,0,0,0.04) 4px)",
        }}
      />

      <div className="relative z-10 flex flex-col items-center">
        {/* Logo mark */}
        <div
          className="mb-7 grid size-20 place-items-center rounded-[22px] border-2 border-accent/50 bg-accent/15 text-accent shadow-[0_0_40px_rgba(127,220,255,0.35),0_0_80px_rgba(127,220,255,0.15)] transition-all duration-700"
          style={{
            opacity: phase >= 1 ? 1 : 0,
            transform:
              phase >= 1
                ? "scale(1) rotate(0deg)"
                : "scale(0.3) rotate(-160deg)",
            transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        >
          <Logo className="size-10" />
        </div>

        {/* Title */}
        <h1
          className="font-display text-5xl tracking-tight text-fg transition-all duration-700 sm:text-6xl"
          style={{
            opacity: phase >= 2 ? 1 : 0,
            transform: phase >= 2 ? "translateY(0)" : "translateY(20px)",
            transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)",
            background: "linear-gradient(135deg, #e8eaf0 0%, #7fdcff 55%, #a5e8ff 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Nexvon
        </h1>

        {/* Subtitle */}
        <p
          className="mt-3 text-sm tracking-wide text-faint transition-all duration-600"
          style={{
            opacity: phase >= 3 ? 1 : 0,
            transform: phase >= 3 ? "translateY(0)" : "translateY(10px)",
          }}
        >
          Your AI companion
        </p>

        {/* Progress bar */}
        <div
          className="mt-10 h-0.5 w-48 overflow-hidden rounded-full bg-border transition-opacity duration-400"
          style={{ opacity: phase >= 3 ? 1 : 0 }}
        >
          <div
            className="h-full rounded-full bg-accent shadow-[0_0_8px_rgba(127,220,255,0.8)] transition-[width] duration-[1200ms] ease-out"
            style={{ width: phase >= 4 ? "100%" : phase >= 3 ? "60%" : "0%" }}
          />
        </div>

        <p
          className="mt-3 text-[11px] uppercase tracking-[0.2em] text-accent transition-opacity duration-400"
          style={{ opacity: phase >= 3 ? 1 : 0 }}
        >
          {phase < 4 ? "Initializing…" : "Ready"}
        </p>
      </div>

      {/* Final fade overlay */}
      <div
        className="pointer-events-none absolute inset-0 bg-void transition-opacity duration-[1200ms] ease-out"
        style={{
          opacity: phase >= 4 ? 1 : 0,
          transitionDelay: phase >= 4 ? "300ms" : "0ms",
        }}
      />
    </div>
  );
}

/** Show intro once per browser session. */
export function useIntroGate() {
  const [showIntro, setShowIntro] = useState(() => {
    if (typeof window === "undefined") return true;
    try {
      return sessionStorage.getItem("nexvon.intro.seen") !== "1";
    } catch {
      return true;
    }
  });
  const [appVisible, setAppVisible] = useState(!showIntro);

  const handleComplete = useCallback(() => {
    try {
      sessionStorage.setItem("nexvon.intro.seen", "1");
    } catch {
      /* ignore */
    }
    setShowIntro(false);
    // Small delay so the fade-out lands cleanly before UI appears
    window.setTimeout(() => setAppVisible(true), 80);
  }, []);

  return { showIntro, appVisible, handleComplete };
}

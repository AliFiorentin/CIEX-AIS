"use client";

import * as React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/* Compare Reveal — from Motiq (https://motiq.dev/components/compare-reveal).
   MIT licensed. Zero runtime dependencies. */

/* -------------------------------------------------------------------------- */
/* Motiq design tokens                                                        */
/* -------------------------------------------------------------------------- */
const MOTIQ_TOKENS = "@layer motiq{:root{--motiq-accent:#315fea;--motiq-accent-text:#244fd1;--motiq-bg:#f7f9fc;--motiq-bg-elevated:#f0f4f9;--motiq-border:#dce4ef;--motiq-border-strong:#c5d1e1;--motiq-fg:#101828;--motiq-fg-secondary:#344054;--motiq-muted:#667085;--motiq-signature:#055071;--motiq-surface:#ffffff;--motiq-surface-2:#f8fafd}}@layer motiq{.dark,[data-theme=\"dark\"]{--motiq-accent:#4f7cff;--motiq-accent-text:#7f9fff;--motiq-bg:#080c14;--motiq-bg-elevated:#0d1420;--motiq-border:#263449;--motiq-border-strong:#354863;--motiq-fg:#f8fafc;--motiq-fg-secondary:#cbd5e1;--motiq-muted:#9caabd;--motiq-signature:#2da8cc;--motiq-surface:#111827;--motiq-surface-2:#192337}}";

/** Merge Tailwind class names; later/consumer classes win on conflict. */
function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/* ---- motion primitives (inlined from @motiq/primitives) ---- */

/**
 * SSR-safe `prefers-reduced-motion` using React 18/19 useSyncExternalStore.
 */
function useReducedMotion(): boolean {
  return React.useSyncExternalStore(
    (notify) => {
      if (typeof window === "undefined") return () => {};
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      mq.addEventListener("change", notify);
      return () => mq.removeEventListener("change", notify);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false
  );
}

/**
 * Returns whether the referenced element is currently worth animating — i.e.
 * on-screen AND the tab is visible.
 */
function useVisibilityPause<T extends Element>(
  ref: React.RefObject<T | null>,
  { threshold = 0.1 }: { threshold?: number } = {},
): boolean {
  const [onScreen, setOnScreen] = React.useState(true);
  const [tabVisible, setTabVisible] = React.useState(true);

  React.useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        setOnScreen(entries.some((e) => e.isIntersecting));
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, threshold]);

  React.useEffect(() => {
    const onVis = () => {
      setTabVisible(document.visibilityState !== "hidden");
    };
    onVis();
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  return onScreen && tabVisible;
}

/**
 * Controlled/uncontrolled value — the standard "value / defaultValue / onChange"
 * pattern shared by selection surfaces. Framework-agnostic.
 */
function useControllableState<T>({
  value,
  defaultValue,
  onChange,
}: {
  value?: T;
  defaultValue: T;
  onChange?: (value: T) => void;
}): [T, (next: T) => void] {
  const isControlled = value !== undefined;
  const [internal, setInternal] = React.useState<T>(defaultValue);
  const current = isControlled ? (value as T) : internal;
  const set = React.useCallback(
    (next: T) => {
      if (!isControlled) setInternal(next);
      onChange?.(next);
    },
    [isControlled, onChange],
  );
  return [current, set];
}

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

/** A comparison side: an image descriptor, or any node you render yourself. */
export type CompareRevealSource = React.ReactNode | { src: string; alt?: string };

export interface CompareRevealProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  /** The "before" side, revealed from the left edge to the divider. */
  before: CompareRevealSource;
  /** The "after" side, filling the rest of the frame. */
  after: CompareRevealSource;
  /** Uncontrolled starting divider position, 0–100. */
  defaultPosition?: number;
  /** Controlled divider position, 0–100. */
  position?: number;
  /** Fires with the new target percentage on drag, key, or snap. */
  onPositionChange?: (pct: number) => void;
  /** Play the one-time self-demonstrating sweep on first viewport entry. */
  introSweep?: boolean;
  /** Divider spring — 140/18 (ζ≈0.76) reads as elastic resistance. */
  stiffness?: number;
  damping?: number;
  /** Corner chips, [before, after]. */
  labels?: [string, string];
  /** Percentage the divider snaps to on double-click. */
  snapOnDoubleClick?: number;
  /** Force the still variant regardless of system preference. */
  reducedMotion?: boolean;
  /** Stop the rAF loop while scrolled offscreen or the tab is hidden. */
  pauseWhenHidden?: boolean;
  /** Restringe o início do arrasto para a proximidade da alavanca central (permite interação com mapa/conteúdo abaixo). */
  dragHandleOnly?: boolean;
}

/* -------------------------------------------------------------------------- */
/* Constants (Motion Lab ship spec)                                           */
/* -------------------------------------------------------------------------- */

const SPRING_K = 140;
const SPRING_C = 18;
/** Intro sweep: 50 → 96 → 4 → 50 over 2.6s, cubic ease per leg. */
const SWEEP_SECONDS = 2.6;
const KEY_STEP = 2;
const KEY_STEP_LARGE = 10;
/** A side's chip fades out once that side narrows past this percentage. */
const LABEL_FADE = 12;

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function sweepAt(u: number): number {
  if (u < 0.38) return lerp(50, 96, easeInOutCubic(u / 0.38));
  if (u < 0.78) return lerp(96, 4, easeInOutCubic((u - 0.38) / 0.4));
  return lerp(4, 50, easeInOutCubic((u - 0.78) / 0.22));
}

function isImageSource(v: CompareRevealSource): v is { src: string; alt?: string } {
  return typeof v === "object" && v !== null && !React.isValidElement(v) && "src" in v;
}

function renderSide(source: CompareRevealSource): React.ReactNode {
  if (isImageSource(source)) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={source.src} alt={source.alt ?? ""} draggable={false} className="h-full w-full object-cover" />;
  }
  return source;
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

function CompareRevealBase({
  before,
  after,
  defaultPosition = 50,
  position,
  onPositionChange,
  introSweep = true,
  stiffness = SPRING_K,
  damping = SPRING_C,
  labels = ["Before", "After"],
  snapOnDoubleClick = 50,
  reducedMotion,
  pauseWhenHidden = true,
  dragHandleOnly = false,
  className,
  ...props
}: CompareRevealProps) {
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const topRef = React.useRef<HTMLDivElement | null>(null);
  const dividerRef = React.useRef<HTMLDivElement | null>(null);
  const handleRef = React.useRef<HTMLButtonElement | null>(null);
  const labelRefs = React.useRef<Array<HTMLElement | null>>([]);
  const paintRef = React.useRef<() => void>(() => {});

  const systemReduced = useReducedMotion();
  const hydrated = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const still = reducedMotion === true || (hydrated && systemReduced);

  const onScreen = useVisibilityPause(rootRef, { threshold: 0.2 });
  const animate = !still && (!pauseWhenHidden || onScreen);

  const [pct, setPct] = useControllableState<number>({
    value: position,
    defaultValue: clamp(defaultPosition, 0, 100),
    onChange: (v) => onPositionChange?.(v),
  });

  const initialPct = clamp(position ?? defaultPosition, 0, 100);
  const sim = React.useRef({
    x: initialPct,
    v: 0,
    target: initialPct,
    dragging: false,
    pointerId: null as number | null,
    introActive: false,
    introDone: false,
    introStart: 0,
  });

  const params = React.useRef({ stiffness, damping, still, introSweep });
  const pctRef = React.useRef(pct);

  React.useEffect(() => {
    params.current = { stiffness, damping, still, introSweep };
    pctRef.current = pct;
  });

  /* ---------------------------------------------------------------- loop -- */

  React.useEffect(() => {
    const paint = () => {
      const x = clamp(sim.current.x, 0, 100);
      const top = topRef.current;
      if (top) top.style.clipPath = `inset(0 ${(100 - x).toFixed(3)}% 0 0)`;
      const divider = dividerRef.current;
      if (divider) divider.style.left = `${x.toFixed(3)}%`;
      handleRef.current?.setAttribute("aria-valuenow", String(Math.round(x)));
      const l0 = labelRefs.current[0];
      const l1 = labelRefs.current[1];
      if (l0) l0.style.opacity = x > LABEL_FADE ? "1" : "0";
      if (l1) l1.style.opacity = x < 100 - LABEL_FADE ? "1" : "0";
    };
    paintRef.current = paint;
    paint();

    if (!animate) {
      sim.current.introDone = true;
      sim.current.introActive = false;
      const simCurrent = sim.current;
      return () => {
        if (simCurrent.introActive) {
          simCurrent.introActive = false;
          simCurrent.introDone = false;
        }
      };
    }

    if (params.current.introSweep && !sim.current.introDone) {
      sim.current.introActive = true;
      sim.current.introStart = performance.now() / 1000;
    }

    let raf = 0;
    let last = performance.now();
    const frame = (ts: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (ts - last) / 1000));
      last = ts;
      const now = ts / 1000;
      const p = params.current;
      const s = sim.current;

      if (s.introActive) {
        const u = (now - s.introStart) / SWEEP_SECONDS;
        if (u >= 1) {
          s.introActive = false;
          s.introDone = true;
          s.target = clamp(pctRef.current, 0, 100);
        } else {
          s.target = sweepAt(u);
        }
      }
      s.v += ((s.target - s.x) * p.stiffness - s.v * p.damping) * dt;
      s.x += s.v * dt;
      if (s.x < 0) {
        s.x = 0;
        s.v = 0;
      }
      if (s.x > 100) {
        s.x = 100;
        s.v = 0;
      }
      paint();
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const simCurrent = sim.current;
    return () => {
      cancelAnimationFrame(raf);
      if (simCurrent.introActive) {
        simCurrent.introActive = false;
        simCurrent.introDone = false;
        simCurrent.target = clamp(pctRef.current, 0, 100);
      }
    };
  }, [animate]);

  const commit = React.useCallback(
    (next: number) => {
      const s = sim.current;
      s.introActive = false;
      s.introDone = true;
      setPct(clamp(next, 0, 100));
    },
    [setPct],
  );

  React.useEffect(() => {
    const s = sim.current;
    if (s.introActive) return;
    const t = clamp(pct, 0, 100);
    if (Math.abs(s.target - t) < 0.0001) return;
    s.target = t;
    if (params.current.still) {
      s.x = t;
      s.v = 0;
      paintRef.current();
    }
  }, [pct]);

  /* ------------------------------------------------------------- pointer -- */

  const positionFromEvent = (clientX: number) => {
    const root = rootRef.current;
    if (!root) return;
    const rect = root.getBoundingClientRect();
    commit(((clientX - rect.left) / Math.max(1, rect.width)) * 100);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (dragHandleOnly) {
      const root = rootRef.current;
      if (!root) return;
      const rect = root.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const dividerX = (sim.current.x / 100) * rect.width;
      if (Math.abs(clickX - dividerX) > 32) {
        return;
      }
    }
    sim.current.dragging = true;
    sim.current.pointerId = e.pointerId;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    positionFromEvent(e.clientX);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!sim.current.dragging || e.pointerId !== sim.current.pointerId) return;
    positionFromEvent(e.clientX);
  };

  const endDrag = () => {
    sim.current.dragging = false;
    sim.current.pointerId = null;
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    const step = e.shiftKey ? KEY_STEP_LARGE : KEY_STEP;
    const base = sim.current.target;
    let next = base;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") next = base + step;
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = base - step;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = 100;
    else return;
    e.preventDefault();
    commit(next);
  };

  const shown = Math.round(clamp(pct, 0, 100));

  return (
    <div
      ref={rootRef}
      role="group"
      aria-label={props["aria-label"] ?? `Comparison: ${labels[0]} versus ${labels[1]}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onDoubleClick={() => commit(snapOnDoubleClick)}
      data-motion={still ? "static" : "animated"}
      className={cn(
        "relative aspect-[16/10] w-full touch-pan-y select-none overflow-hidden rounded-[16px]",
        "border border-[var(--motiq-border,#263449)] bg-[var(--motiq-bg-elevated,#0d1420)]",
        dragHandleOnly ? "" : "cursor-ew-resize",
        className,
      )}
      {...props}
    >
      <div className="absolute inset-0">{renderSide(after)}</div>
      <div ref={topRef} className="absolute inset-0 will-change-[clip-path]" style={{ clipPath: `inset(0 ${100 - shown}% 0 0)` }}>
        {renderSide(before)}
      </div>

      {([labels[0], labels[1]] as const).map((text, i) => (
        <span
          key={text + i}
          ref={(el) => {
            labelRefs.current[i] = el;
          }}
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute top-4 z-[8] rounded-full px-3.5 py-1.5 transition-opacity duration-300",
            "border border-white/25 bg-slate-900/85 backdrop-blur-xl shadow-xl",
            "font-sans text-[11px] uppercase tracking-wider text-white font-bold",
            i === 0 ? "left-4" : "right-4",
          )}
        >
          {text}
        </span>
      ))}

      <div
        ref={dividerRef}
        className="pointer-events-none absolute bottom-0 top-0 z-10 -ml-px w-0.5 will-change-[left]"
        style={{
          left: `${shown}%`,
          background: "rgba(255, 255, 255, 0.85)",
          boxShadow: "0 0 10px rgba(0, 0, 0, 0.3)",
        }}
      >
        <button
          ref={handleRef}
          type="button"
          role="slider"
          aria-label={`Reveal divider, ${labels[0]} to ${labels[1]}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={shown}
          aria-valuetext={`${shown}% ${labels[0]}`}
          onKeyDown={onKeyDown}
          className={cn(
            "pointer-events-auto absolute left-1/2 top-1/2 grid h-10 w-10 -translate-x-1/2 -translate-y-1/2",
            "cursor-ew-resize place-items-center rounded-full p-0 backdrop-blur-xl transition-all duration-150 active:scale-95",
            "border-2 border-white/90 text-white bg-slate-900/90 shadow-2xl",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2",
          )}
          style={{
            boxShadow:
              "0 4px 20px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)",
          }}
        >
          <svg width="16" height="12" viewBox="0 0 18 14" fill="none" aria-hidden="true">
            <path d="M6 1 L1 7 L6 13" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M12 1 L17 7 L12 13" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export function CompareReveal(props: CompareRevealProps) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: MOTIQ_TOKENS }} />
      <CompareRevealBase {...props} />
    </>
  );
}

export default CompareReveal;

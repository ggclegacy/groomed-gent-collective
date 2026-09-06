'use client';
import { useEffect, useRef } from 'react';

// Deterministic geometry avoids hydration variation; these are abstract signal nodes, not data.
const NETWORK_POINTS = Array.from({ length: 30 }, (_, i) => {
  const angle = i * 2.399963;
  const radius = 23 + Math.sqrt(i / 29) * 80;
  return [
    Number((120 + Math.cos(angle) * radius).toFixed(2)),
    Number((120 + Math.sin(angle) * radius).toFixed(2)),
  ];
});
const NETWORK_EDGES: [number, number][] = NETWORK_POINTS.flatMap(([x, y], i) =>
  NETWORK_POINTS.flatMap(([xx, yy], j): [number, number][] =>
    j > i && Math.hypot(xx - x, yy - y) < 68 ? [[i, j]] : [],
  ),
);

/** Ambient identity visualization, never a signal of service connectivity. */
export function CassiusCore({ compact = false }: { compact?: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    let visible = true;
    let frame = 0;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePlayback = () => {
      element.dataset.paused = String(
        !visible || document.hidden || motion.matches,
      );
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      updatePlayback();
    });
    const reset = () => {
      cancelAnimationFrame(frame);
      element.style.setProperty('--core-x', '0deg');
      element.style.setProperty('--core-y', '0deg');
    };
    const move = (event: PointerEvent) => {
      if (
        motion.matches ||
        document.documentElement.dataset.ambientMotion === 'paused' ||
        event.pointerType !== 'mouse'
      )
        return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const box = element.getBoundingClientRect();
        element.style.setProperty(
          '--core-y',
          `${((event.clientX - box.left) / box.width - 0.5) * 16}deg`,
        );
        element.style.setProperty(
          '--core-x',
          `${((event.clientY - box.top) / box.height - 0.5) * -12}deg`,
        );
      });
    };
    observer.observe(element);
    updatePlayback();
    const preference = () => {
      reset();
      updatePlayback();
    };
    document.addEventListener('visibilitychange', updatePlayback);
    motion.addEventListener('change', preference);
    element.addEventListener('pointermove', move);
    element.addEventListener('pointerleave', reset);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      document.removeEventListener('visibilitychange', updatePlayback);
      motion.removeEventListener('change', preference);
      element.removeEventListener('pointermove', move);
      element.removeEventListener('pointerleave', reset);
    };
  }, []);
  return (
    <div
      ref={root}
      className={`cassius-core${compact ? ' is-compact' : ''}`}
      aria-hidden="true"
    >
      <div className="core-aura" />
      <div className="core-projection" />
      <div className="core-assembly">
        <div className="core-calibration" />
        <div className="core-outer-rule" />
        <div className="core-chassis" />
        <div className="core-gold-bezel" />
        <div className="core-bezel-cuts" />
        <div className="core-inner-rim" />
        <div className="core-sphere">
          <div className="core-fluid fluid-one" />
          <div className="core-fluid fluid-two" />
          <svg className="core-network" viewBox="0 0 240 240" fill="none">
            {NETWORK_EDGES.map(([a, b]) => (
              <path
                key={`${a}-${b}`}
                d={`M${NETWORK_POINTS[a][0]} ${NETWORK_POINTS[a][1]}L${NETWORK_POINTS[b][0]} ${NETWORK_POINTS[b][1]}`}
              />
            ))}
            {NETWORK_POINTS.map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r={i % 4 === 0 ? 1.5 : 0.8} />
            ))}
          </svg>
          <div className="core-heart" />
          <svg className="core-filaments" viewBox="0 0 240 240" fill="none">
            <path d="M57 118C74 41 185 65 161 138S79 176 92 103S188 151 128 173S56 91 131 81S172 196 91 147S141 37 158 123" />
            <path d="M69 136C37 82 128 41 155 94S184 180 113 155S100 49 161 117S62 185 82 110S169 92 138 158" />
            <path
              className="filament-signal"
              d="M57 118C74 41 185 65 161 138S79 176 92 103S188 151 128 173S56 91 131 81S172 196 91 147S141 37 158 123"
            />
          </svg>
          <div className="core-shell" />
          <div className="core-specular" />
        </div>
        <div className="core-signal-track">
          <span />
        </div>
        <div className="core-crest">
          <span>C</span>
        </div>
        <div className="core-lock lock-west">
          <span />
        </div>
        <div className="core-lock lock-east">
          <span />
        </div>
        <div className="core-lock lock-south">
          <span />
        </div>
      </div>
    </div>
  );
}

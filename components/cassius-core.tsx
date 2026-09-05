'use client';
import { useEffect, useRef } from 'react';

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
      if (motion.matches || event.pointerType !== 'mouse') return;
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
        <div className="core-orbit orbit-one">
          <div className="orbit-tracer" />
        </div>
        <div className="core-orbit orbit-two">
          <div className="orbit-tracer" />
        </div>
        <div className="core-orbit orbit-three">
          <div className="orbit-tracer" />
        </div>
        <div className="core-sphere">
          <div className="core-fluid fluid-one" />
          <div className="core-fluid fluid-two" />
          <div className="core-heart" />
          <svg className="core-filaments" viewBox="0 0 240 240" fill="none">
            <path d="M-10 148C50 10 174 224 250 73M-12 165C65 24 167 236 250 91M-10 129C50-5 174 207 250 56" />
            <path d="M65-15C211 46 10 179 170 257M85-15C228 62 30 181 190 257" />
            <path
              className="filament-signal"
              d="M-10 148C50 10 174 224 250 73M65-15C211 46 10 179 170 257"
            />
          </svg>
          <div className="core-latitude latitude-one" />
          <div className="core-latitude latitude-two" />
          <div className="core-shell" />
          <div className="core-specular" />
        </div>
        <div className="core-pole pole-north" />
        <div className="core-pole pole-south" />
      </div>
    </div>
  );
}

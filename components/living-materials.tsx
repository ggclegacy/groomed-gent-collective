'use client';
import { useEffect, useSyncExternalStore } from 'react';
import { Pause, Play } from 'lucide-react';
const key = 'ggc-ambient-motion';
const eventName = 'ggc-motion-preference';
let memoryPaused = false;
function snapshot() {
  try {
    return localStorage.getItem(key) === 'paused';
  } catch {
    return memoryPaused;
  }
}
function subscribe(callback: () => void) {
  window.addEventListener(eventName, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(eventName, callback);
    window.removeEventListener('storage', callback);
  };
}
const surfaces =
  '.vd-glass,.vd-command,.ps-glass,.ps-product,.cs-director,.cs-canvas-panel,.panel,.membership,.status-hero,.intelligence-stage,.member-door,.membership-record';
/** Decorative light only. Never represents account activity or service connectivity. */
export function LivingMaterials() {
  const paused = useSyncExternalStore(subscribe, snapshot, () => false);
  useEffect(() => {
    document.documentElement.dataset.ambientMotion = paused ? 'paused' : 'on';
    return () => {
      delete document.documentElement.dataset.ambientMotion;
    };
  }, [paused]);
  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let scanFrame = 0;
    let hovered: HTMLElement | null = null;
    const observed = new Set<Element>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          (entry.target as HTMLElement).dataset.materialVisible = String(
            entry.isIntersecting,
          );
      },
      { threshold: 0.05 },
    );
    const scan = () => {
      for (const node of observed)
        if (!node.isConnected) {
          observer.unobserve(node);
          observed.delete(node);
        }
      document.querySelectorAll<HTMLElement>(surfaces).forEach((node) => {
        if (!observed.has(node)) {
          observed.add(node);
          node.dataset.material = '';
          observer.observe(node);
        }
      });
    };
    const mutations = new MutationObserver(() => {
      cancelAnimationFrame(scanFrame);
      scanFrame = requestAnimationFrame(scan);
    });
    const visibility = () => {
      root.dataset.ambientPage = document.hidden ? 'hidden' : 'visible';
    };
    const move = (event: PointerEvent) => {
      if (
        media.matches ||
        snapshot() ||
        document.hidden ||
        event.pointerType !== 'mouse'
      )
        return;
      const target = (event.target as Element).closest<HTMLElement>(surfaces);
      if (hovered !== target) {
        hovered?.style.removeProperty('--reflection-x');
        hovered = target;
      }
      cancelAnimationFrame(frame);
      if (!target) return;
      const x = event.clientX;
      frame = requestAnimationFrame(() => {
        const rect = target.getBoundingClientRect();
        target.style.setProperty(
          '--reflection-x',
          `${((x - rect.left) / rect.width) * 65 - 32.5}%`,
        );
      });
    };
    scan();
    visibility();
    mutations.observe(document.body, { childList: true, subtree: true });
    document.addEventListener('visibilitychange', visibility);
    document.addEventListener('pointermove', move, { passive: true });
    return () => {
      observer.disconnect();
      mutations.disconnect();
      cancelAnimationFrame(frame);
      cancelAnimationFrame(scanFrame);
      document.removeEventListener('visibilitychange', visibility);
      document.removeEventListener('pointermove', move);
      hovered?.style.removeProperty('--reflection-x');
      delete root.dataset.ambientPage;
      for (const node of observed) {
        node.removeAttribute('data-material');
        node.removeAttribute('data-material-visible');
      }
    };
  }, []);
  return (
    <>
      <div className="living-atmosphere" aria-hidden="true">
        <i className="ambient-gold" />
        <i className="ambient-platinum" />
        <span className="ambient-horizon" />
      </div>
      <button
        className="ambient-toggle"
        type="button"
        aria-label={paused ? 'Enable ambient motion' : 'Pause ambient motion'}
        aria-pressed={!paused}
        onClick={() => {
          memoryPaused = !paused;
          try {
            localStorage.setItem(key, paused ? 'on' : 'paused');
          } catch {
            // Keep the control usable when browser storage is unavailable.
          }
          window.dispatchEvent(new Event(eventName));
        }}
        title="Ambient motion follows your device’s reduced-motion preference"
      >
        {paused ? <Play size={15} /> : <Pause size={15} />}
        <span>{paused ? 'Motion off' : 'Motion on'}</span>
      </button>
    </>
  );
}

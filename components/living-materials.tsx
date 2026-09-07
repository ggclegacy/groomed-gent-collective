'use client';
import { useEffect, useSyncExternalStore } from 'react';
import { surfacePose } from '@/lib/spatial/model';
import { Pause, Sparkles } from 'lucide-react';
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
  '.command-theatre,.spatial-card,.spatial-instrument,.gent-record,.life-pulse,.desk-focus,.gent-dialog,.vd-glass,.vd-command,.ps-glass,.ps-product,.cs-director,.cs-canvas-panel,.panel,.membership,.status-hero,.intelligence-stage,.member-door,.membership-record,.pm-panel,.pm-hero,.spatial-next';
/** Delay decorative DOM annotations until the route's client boundary has hydrated. */
export function useMaterialScope() {
  useEffect(() => {
    document.body.dataset.materialReady = 'true';
    window.dispatchEvent(new Event('ggc-material-ready'));
    return () => { delete document.body.dataset.materialReady; };
  }, []);
}
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
    const pointer = window.matchMedia('(hover: hover) and (pointer: fine)');
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
      if (document.body.dataset.materialReady !== 'true') return;
      for (const node of observed)
        if (!node.isConnected) {
          observer.unobserve(node);
          observed.delete(node);
        }
      document.querySelectorAll<HTMLElement>(surfaces).forEach((node) => {
        if (!observed.has(node)) {
          observed.add(node);
          node.dataset.material = '';
          if (node.matches('.spatial-card,.membership,.vd-command,.ps-product,.gent-record,.vd-glass,.ps-glass,.pm-panel'))
            node.dataset.spatial = 'true';
          observer.observe(node);
        }
      });
    };
    const mutations = new MutationObserver(() => {
      cancelAnimationFrame(scanFrame);
      scanFrame = requestAnimationFrame(scan);
    });
    const clear = () => {
      cancelAnimationFrame(frame);
      hovered?.style.removeProperty('--reflection-x');
      hovered?.style.removeProperty('--tilt-x');
      hovered?.style.removeProperty('--tilt-y');
      hovered = null;
    };
    const visibility = () => {
      if (document.hidden) clear();
      root.dataset.ambientPage = document.hidden ? 'hidden' : 'visible';
    };
    const move = (event: PointerEvent) => {
      if (
        media.matches ||
        root.dataset.accountMotion === 'reduce' ||
        !pointer.matches ||
        snapshot() ||
        document.hidden ||
        event.pointerType !== 'mouse'
      )
        return;
      if (!(event.target instanceof Element)) return;
      const target = event.target.closest<HTMLElement>(surfaces);
      if (hovered !== target) {
        clear();
        hovered = target;
      }
      cancelAnimationFrame(frame);
      if (!target) return;
      const x = event.clientX,
        y = event.clientY;
      frame = requestAnimationFrame(() => {
        const rect = target.getBoundingClientRect();
        const pose = surfacePose(
          x - rect.left,
          y - rect.top,
          rect.width,
          rect.height,
        );
        if (
          target.dataset.spatial === 'true' &&
          !target.matches(':focus-within') &&
          !target.querySelector('input,textarea,select')
        ) {
          target.style.setProperty('--tilt-x', `${pose.x}deg`);
          target.style.setProperty('--tilt-y', `${pose.y}deg`);
        }
        target.style.setProperty(
          '--reflection-x',
          `${pose.lightX * 0.65 - 32.5}%`,
        );
      });
    };
    scan();
    window.addEventListener('ggc-material-ready', scan);
    visibility();
    mutations.observe(document.body, { childList: true, subtree: true });
    document.addEventListener('visibilitychange', visibility);
    document.addEventListener('pointermove', move, { passive: true });
    document.documentElement.addEventListener('pointerleave', clear);
    window.addEventListener('blur', clear);
    document.addEventListener('focusin', clear);
    window.addEventListener(eventName, clear);
    window.addEventListener('ggc-account-motion', clear);
    window.addEventListener('storage', clear);
    media.addEventListener('change', clear);
    pointer.addEventListener('change', clear);
    return () => {
      window.removeEventListener('ggc-material-ready', scan);
      observer.disconnect();
      mutations.disconnect();
      cancelAnimationFrame(frame);
      cancelAnimationFrame(scanFrame);
      document.removeEventListener('visibilitychange', visibility);
      document.removeEventListener('pointermove', move);
      document.documentElement.removeEventListener('pointerleave', clear);
      window.removeEventListener('blur', clear);
      document.removeEventListener('focusin', clear);
      window.removeEventListener(eventName, clear);
      window.removeEventListener('ggc-account-motion', clear);
      window.removeEventListener('storage', clear);
      media.removeEventListener('change', clear);
      pointer.removeEventListener('change', clear);
      clear();
      hovered?.style.removeProperty('--reflection-x');
      delete root.dataset.ambientPage;
      for (const node of observed) {
        node.removeAttribute('data-material');
        node.removeAttribute('data-spatial');
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
        {paused ? <Sparkles size={15} /> : <Pause size={15} />}
        <span>{paused ? 'Motion off' : 'Motion on'}</span>
      </button>
    </>
  );
}

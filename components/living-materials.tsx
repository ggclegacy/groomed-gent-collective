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
        for (const entry of entries) {
          const target = entry.target as HTMLElement;
          target.dataset.materialVisible = String(entry.isIntersecting);
          if (entry.isIntersecting) target.dataset.materialEntered = 'true';
        }
      },
      { threshold: 0.05 },
    );
    const register = (node: Element) => {
      const add = (surface: Element) => {
        if (observed.has(surface)) return;
        observed.add(surface);
        (surface as HTMLElement).dataset.material = '';
        observer.observe(surface);
      };
      if (node.matches(surfaces)) add(node);
      node.querySelectorAll(surfaces).forEach(add);
    };
    const resetReflection = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      hovered?.style.removeProperty('--reflection-x');
      hovered?.style.removeProperty('--reflection-y');
      hovered = null;
    };
    // Observe only newly inserted subtrees, not every surface on each text update.
    const additions = new Set<Element>();
    let removed = false;
    const mutations = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes)
          if (node instanceof Element) additions.add(node);
        removed ||= Array.from(record.removedNodes).some((node) => node instanceof Element);
      }
      if (scanFrame || (!additions.size && !removed)) return;
      scanFrame = requestAnimationFrame(() => {
        scanFrame = 0;
        if (removed) {
          for (const node of observed)
            if (!node.isConnected) {
              observer.unobserve(node);
              observed.delete(node);
            }
          if (hovered && !hovered.isConnected) resetReflection();
        }
        for (const node of additions) if (node.isConnected) register(node);
        additions.clear();
        removed = false;
      });
    });
    const visibility = () => {
      root.dataset.ambientPage = document.hidden ? 'hidden' : 'visible';
      if (document.hidden) resetReflection();
    };
    let pointerX = 0;
    let pointerY = 0;
    const move = (event: PointerEvent) => {
      if (media.matches || snapshot() || document.hidden || event.pointerType !== 'mouse') return;
      const target = event.target instanceof Element
        ? event.target.closest<HTMLElement>(surfaces) : null;
      if (hovered !== target) {
        resetReflection();
        hovered = target;
      }
      if (!target) return;
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (!hovered?.isConnected) return;
        const rect = hovered.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        hovered.style.setProperty('--reflection-x', `${((pointerX - rect.left) / rect.width - 0.5) * 40}%`);
        hovered.style.setProperty('--reflection-y', `${((pointerY - rect.top) / rect.height - 0.5) * 24}%`);
      });
    };
    const leave = (event: PointerEvent) => {
      if (!event.relatedTarget) resetReflection();
    };
    register(document.body);
    visibility();
    mutations.observe(document.body, { childList: true, subtree: true });
    document.addEventListener('visibilitychange', visibility);
    document.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('pointerout', leave);
    window.addEventListener('blur', resetReflection);
    window.addEventListener(eventName, resetReflection);
    media.addEventListener('change', resetReflection);
    return () => {
      observer.disconnect();
      mutations.disconnect();
      cancelAnimationFrame(frame);
      cancelAnimationFrame(scanFrame);
      document.removeEventListener('visibilitychange', visibility);
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerout', leave);
      window.removeEventListener('blur', resetReflection);
      window.removeEventListener(eventName, resetReflection);
      media.removeEventListener('change', resetReflection);
      resetReflection();
      delete root.dataset.ambientPage;
      for (const node of observed) {
        node.removeAttribute('data-material');
        node.removeAttribute('data-material-visible');
        node.removeAttribute('data-material-entered');
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

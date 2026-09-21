import { useEffect, useRef, type RefObject } from "react";
import { clamp } from "@/lib/utils";

const ZOOM_MIN = 16;
const ZOOM_MAX = 320;

type PinchState = {
  dist: number;
  zoom: number;
  focalX: number;
  scrollLeft: number;
};

function touchDist(a: Touch, b: Touch) {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

/**
 * Pinch-to-zoom (and trackpad pinch) on a timeline scroller only.
 * Keeps the time under the pinch midpoint locked in place.
 */
export function usePinchZoom(
  elRef: RefObject<HTMLElement | null>,
  zoom: number,
  setZoom: (zoom: number) => void,
  onPinching?: (active: boolean) => void,
) {
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const pinchRef = useRef<PinchState | null>(null);
  const onPinchingRef = useRef(onPinching);
  onPinchingRef.current = onPinching;
  const setZoomRef = useRef(setZoom);
  setZoomRef.current = setZoom;

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;

    const applyZoom = (next: number, focalX: number, fromZoom: number, fromScroll: number) => {
      const z = clamp(next, ZOOM_MIN, ZOOM_MAX);
      const time = (fromScroll + focalX) / Math.max(1, fromZoom);
      setZoomRef.current(z);
      requestAnimationFrame(() => {
        el.scrollLeft = time * z - focalX;
      });
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const a = e.touches[0]!;
        const b = e.touches[1]!;
        const rect = el.getBoundingClientRect();
        pinchRef.current = {
          dist: Math.max(1, touchDist(a, b)),
          zoom: zoomRef.current,
          focalX: (a.clientX + b.clientX) / 2 - rect.left,
          scrollLeft: el.scrollLeft,
        };
        onPinchingRef.current?.(true);
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      const state = pinchRef.current;
      if (!state || e.touches.length < 2) return;
      e.preventDefault();
      const a = e.touches[0]!;
      const b = e.touches[1]!;
      const dist = touchDist(a, b);
      applyZoom(state.zoom * (dist / state.dist), state.focalX, state.zoom, state.scrollLeft);
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2 && pinchRef.current) {
        pinchRef.current = null;
        onPinchingRef.current?.(false);
      }
    };

    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const focalX = e.clientX - rect.left;
      const prev = zoomRef.current;
      const next = prev * Math.exp(-e.deltaY * 0.01);
      applyZoom(next, focalX, prev, el.scrollLeft);
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchEnd);
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
      el.removeEventListener("wheel", onWheel);
    };
  }, [elRef]);
}

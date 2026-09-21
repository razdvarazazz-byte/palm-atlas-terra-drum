import { useEffect, useRef, useState, type RefObject } from "react";
import { engine } from "@/lib/audio/engine";

export function usePlayhead() {
  const [time, setTime] = useState(() => engine.getPlayhead());
  useEffect(() => engine.subscribe(setTime), []);
  return time;
}

export function usePlaying() {
  const [playing, setPlaying] = useState(() => engine.playing);
  const [recording, setRecording] = useState(() => engine.recording);
  useEffect(() => {
    const offPlay = engine.subscribePlay((p) => setPlaying(p));
    const id = window.setInterval(() => {
      setRecording(engine.recording);
    }, 400);
    return () => {
      offPlay();
      window.clearInterval(id);
    };
  }, []);
  return { playing, recording };
}

/**
 * Drive every playhead needle from one rAF tick so the ruler and the lanes
 * cannot drift. Transform only — no React re-render of the timeline.
 */
export function useSyncedPlayheads(
  zoom: number,
  scroller: RefObject<HTMLElement | null>,
  followWhilePlaying = true,
) {
  const lineRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const followRef = useRef(followWhilePlaying);
  followRef.current = followWhilePlaying;

  useEffect(() => {
    const apply = (t: number) => {
      const z = zoomRef.current;
      const x = Math.max(0, Number.isFinite(t) ? t : 0) * z;
      const transform = `translate3d(${x}px,0,0)`;
      const line = lineRef.current;
      const head = headRef.current;
      if (line) line.style.transform = transform;
      if (head) head.style.transform = transform;
      if (!followRef.current || !engine.playing) return;
      const sc = scroller.current;
      if (!sc) return;
      const view = sc.scrollLeft;
      const w = sc.clientWidth;
      if (x > view + w - 72) sc.scrollLeft = x - w + 110;
      else if (x < view + 24 && view > 0) sc.scrollLeft = Math.max(0, x - 48);
    };
    apply(engine.getPlayhead());
    return engine.subscribe(apply);
  }, [scroller]);

  useEffect(() => {
    const x = Math.max(0, engine.getPlayhead()) * zoom;
    const transform = `translate3d(${x}px,0,0)`;
    if (lineRef.current) lineRef.current.style.transform = transform;
    if (headRef.current) headRef.current.style.transform = transform;
  }, [zoom]);

  return { lineRef, headRef };
}

/** Paint a clock without re-rendering the transport every frame. */
export function usePlayheadClock(ref: RefObject<HTMLElement | null>, format: (t: number) => string) {
  useEffect(() => {
    const node = ref.current;
    if (node) node.textContent = format(engine.getPlayhead());
    return engine.subscribe((t) => {
      const el = ref.current;
      if (el) el.textContent = format(t);
    });
  }, [ref, format]);
}

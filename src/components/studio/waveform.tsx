import { memo, useEffect, useRef } from "react";
import { getWaveformPeaks } from "@/lib/audio/buffers";

const COLOR: Record<string, string> = {
  "lane-coral": "#e85d3a",
  "lane-teal": "#2a9d8f",
  "lane-blue": "#4c8dff",
  "lane-sage": "#6fbf73",
  "lane-bronze": "#c4923a",
  "lane-slate": "#7d8aa3",
};

export const Waveform = memo(function Waveform({
  bufferId,
  color,
  offset,
  duration,
  bufferDuration,
  fadeIn,
  fadeOut,
  className,
}: {
  bufferId: string;
  color: string;
  offset: number;
  duration: number;
  bufferDuration: number;
  fadeIn: number;
  fadeOut: number;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const draw = () => {
      const w = Math.max(1, Math.round(parent.clientWidth));
      const h = Math.max(1, Math.round(parent.clientHeight));
      const dpr = Math.min(1.5, window.devicePixelRatio || 1);
      if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
      }
      const g = canvas.getContext("2d");
      if (!g) return;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, w, h);

      const bins = Math.min(768, Math.max(64, w));
      const peaks = getWaveformPeaks(bufferId, bins);
      const stroke = COLOR[color] ?? "#e85d3a";
      g.fillStyle = stroke;

      const mid = h / 2;
      if (!peaks || bufferDuration <= 0) {
        g.globalAlpha = 0.35;
        g.fillRect(0, mid - 1, w, 2);
        return;
      }

      const peakBins = peaks.length / 2;
      const startBin = (offset / bufferDuration) * peakBins;
      const endBin = ((offset + duration) / bufferDuration) * peakBins;
      const span = Math.max(1, endBin - startBin);
      const step = w > 480 ? 2 : 1;

      g.globalAlpha = 0.92;
      for (let x = 0; x < w; x += step) {
        const b = startBin + (x / w) * span;
        const i = Math.min(peakBins - 1, Math.max(0, Math.floor(b)));
        const min = peaks[i * 2] ?? 0;
        const max = peaks[i * 2 + 1] ?? 0;
        const y1 = mid + min * (h * 0.42);
        const y2 = mid + max * (h * 0.42);
        g.fillRect(x, y1, step, Math.max(1, y2 - y1));
      }

      if (fadeIn > 0 || fadeOut > 0) {
        g.globalCompositeOperation = "destination-in";
        const grd = g.createLinearGradient(0, 0, w, 0);
        const inP = duration > 0 ? fadeIn / duration : 0;
        const outP = duration > 0 ? fadeOut / duration : 0;
        grd.addColorStop(0, "rgba(0,0,0,0.15)");
        grd.addColorStop(Math.min(0.49, Math.max(0, inP)), "rgba(0,0,0,1)");
        grd.addColorStop(Math.max(0.51, 1 - Math.max(0, outP)), "rgba(0,0,0,1)");
        grd.addColorStop(1, "rgba(0,0,0,0.15)");
        g.fillStyle = grd;
        g.fillRect(0, 0, w, h);
        g.globalCompositeOperation = "source-over";
      }
    };

    draw();
    let raf = 0;
    let tries = 0;
    const retry = window.setInterval(() => {
      tries += 1;
      if (getWaveformPeaks(bufferId, 32) || tries > 24) {
        window.clearInterval(retry);
        draw();
      }
    }, 200);
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(draw);
    });
    ro.observe(parent);
    return () => {
      window.clearInterval(retry);
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [bufferId, color, offset, duration, bufferDuration, fadeIn, fadeOut]);

  return <canvas ref={ref} className={className} />;
});

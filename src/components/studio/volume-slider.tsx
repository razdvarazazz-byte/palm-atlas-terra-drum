import { Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import { TRACK_VOL_MAX } from "@/lib/studio-types";

export function VolumeSlider({
  value,
  onChange,
  max = TRACK_VOL_MAX,
  ariaLabel,
  compact = false,
  showMute = true,
}: {
  value: number;
  onChange: (v: number) => void;
  max?: number;
  ariaLabel: string;
  compact?: boolean;
  showMute?: boolean;
}) {
  const pct = Math.round((value / max) * 100);
  const display = Math.round(value * 100);
  const muted = value <= 0.001;
  return (
    <div className={cn("flex min-w-0 items-center", compact ? "gap-0.5" : "gap-1")}>
      {showMute ? (
        <button
          type="button"
          className="grid size-7 shrink-0 place-items-center text-muted-foreground"
          aria-label={muted ? "Включить звук" : "Выключить звук"}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onChange(muted ? 1 : 0);
          }}
        >
          {muted ? <VolumeX className="size-3.5" /> : <Volume2 className="size-3.5" />}
        </button>
      ) : null}
      <input
        type="range"
        min={0}
        max={max}
        step={0.01}
        value={value}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => onChange(Number(e.target.value))}
        className="vol-range min-w-0 flex-1"
        style={{
          background: `linear-gradient(to right, var(--color-primary) ${pct}%, color-mix(in oklab, var(--color-foreground) 14%, transparent) ${pct}%)`,
        }}
        aria-label={ariaLabel}
      />
      <span
        className={cn(
          "shrink-0 text-right font-mono text-[10px] tabular",
          compact ? "w-6" : "w-7",
          value > 1.01 ? "text-play" : "text-muted-foreground",
        )}
      >
        {display}
      </span>
    </div>
  );
}

import { useEffect, useState } from "react";
import { BPM_MAX, BPM_MIN } from "@/lib/clip-time";
import { cn } from "@/lib/utils";

export function BpmInput({
  value,
  onCommit,
  onArm,
  ariaLabel = "BPM",
  className,
}: {
  value: number;
  onCommit: (bpm: number) => void;
  onArm?: () => void;
  ariaLabel?: string;
  className?: string;
}) {
  const [text, setText] = useState(() => formatBpm(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(formatBpm(value));
  }, [value, focused]);

  const commit = () => {
    const parsed = parseBpm(text);
    if (parsed == null) {
      setText(formatBpm(value));
      return;
    }
    onCommit(parsed);
    setText(formatBpm(parsed));
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      autoComplete="off"
      spellCheck={false}
      aria-label={ariaLabel}
      value={text}
      onFocus={() => {
        setFocused(true);
        onArm?.();
      }}
      onChange={(e) => setText(e.target.value.replace(/[^\d.,]/g, "").replace(",", "."))}
      onBlur={() => {
        setFocused(false);
        commit();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.currentTarget.blur();
        } else if (e.key === "Escape") {
          setText(formatBpm(value));
          e.currentTarget.blur();
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          onCommit(clampBpm((parseBpm(text) ?? value) + (e.shiftKey ? 5 : 1)));
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          onCommit(clampBpm((parseBpm(text) ?? value) - (e.shiftKey ? 5 : 1)));
        }
      }}
      className={cn(
        "h-7 w-12 shrink-0 rounded-md border border-input/80 bg-foreground/6 px-0.5 text-center font-mono text-xs text-foreground tabular",
        className,
      )}
    />
  );
}

export function formatBpm(n: number): string {
  if (!Number.isFinite(n)) return "120";
  const r = Math.round(n * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

export function parseBpm(raw: string): number | null {
  const n = Number(raw.trim());
  if (!Number.isFinite(n) || n <= 0) return null;
  return clampBpm(n);
}

export function clampBpm(n: number): number {
  return Math.min(BPM_MAX, Math.max(BPM_MIN, n));
}

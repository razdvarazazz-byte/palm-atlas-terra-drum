import { useEffect, useState } from "react";
import { Monitor, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { setUiMode, useUiMode, type UiMode } from "@/lib/ui-mode";

export function UiModeSwitch({ compact = false }: { compact?: boolean }) {
  const mode = useUiMode();
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const shown: UiMode = ready ? mode : "phone";
  const set = (next: UiMode) => setUiMode(next);

  if (compact) {
    return (
      <button
        type="button"
        className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-foreground/8 hover:text-foreground"
        title={shown === "pc" ? "Режим ПК — нажми для телефона" : "Режим телефона — нажми для ПК"}
        aria-label={shown === "pc" ? "Переключить на телефон" : "Переключить на ПК"}
        onClick={() => set(shown === "pc" ? "phone" : "pc")}
      >
        {shown === "pc" ? <Monitor className="size-4" /> : <Smartphone className="size-4" />}
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-border/70 bg-card/80 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Режим</p>
      <p className="mt-1 text-sm font-medium">Телефон или компьютер</p>
      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
        На телефоне — крупные кнопки. На ПК — шире дорожки и точнее ручки клипа.
      </p>
      <div className="mt-3 flex items-center gap-3">
        <span className={cn("flex items-center gap-1.5 text-xs font-medium", shown === "phone" ? "text-foreground" : "text-muted-foreground")}>
          <Smartphone className="size-4" />
          Телефон
        </span>
        <input
          type="range"
          min={0}
          max={1}
          step={1}
          value={shown === "pc" ? 1 : 0}
          onChange={(e) => set(e.target.value === "1" ? "pc" : "phone")}
          className="vol-range min-w-0 flex-1"
          style={{
            background: `linear-gradient(to right, var(--color-primary) ${shown === "pc" ? 100 : 0}%, color-mix(in oklab, var(--color-foreground) 14%, transparent) ${shown === "pc" ? 100 : 0}%)`,
          }}
          aria-label="Режим интерфейса"
        />
        <span className={cn("flex items-center gap-1.5 text-xs font-medium", shown === "pc" ? "text-foreground" : "text-muted-foreground")}>
          ПК
          <Monitor className="size-4" />
        </span>
      </div>
    </div>
  );
}

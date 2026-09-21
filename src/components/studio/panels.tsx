import { useRef, useState, type PointerEvent, type ReactNode } from "react";
import {
  AudioLines,
  ChevronDown,
  ChevronUp,
  Film,
  FlipHorizontal2,
  Gauge,
  Music2,
  Plus,
  Scissors,
  Sparkles,
  SplitSquareVertical,
  Timer,
  Trash2,
  Upload,
  Volume2,
  WandSparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStudio } from "@/lib/studio-store";
import {
  actionCutMarked,
  actionDeleteSelected,
  actionDenoise,
  actionDetectBpm,
  actionDetectKey,
  actionEnhance,
  actionLiftMarked,
  actionNormalize,
  actionPitch,
  actionReverse,
  actionSetClipBpm,
  actionSetMark,
  actionSplit,
  actionSplitAtPlayhead,
  cancelCurrentOp,
  formatKey,
  importMediaFile,
} from "@/lib/clip-actions";
import { clipBpm, clipRate, RATE_MAX, RATE_MIN } from "@/lib/clip-time";
import { cn } from "@/lib/utils";
import { MASTER_VOL_MAX, TRACK_VOL_MAX } from "@/lib/studio-types";
import type { Track } from "@/lib/studio-types";
import { HistoryBtn } from "./chrome";
import { BpmInput } from "./bpm-input";

const MEDIA_ACCEPT = "audio/*,video/*,.mp3,.wav,.ogg,.m4a,.flac,.webm,.mp4,.mov,.mkv,.m4v,.aac,.3gp";

export function BottomPanel() {
  const tab = useStudio((s) => s.bottomTab);
  const setTab = useStudio((s) => s.setBottomTab);
  const clipId = useStudio((s) => s.selectedClipId);
  const panelOpen = useStudio((s) => s.panelOpen);
  const setPanelOpen = useStudio((s) => s.setPanelOpen);
  const lastGap = useStudio((s) => s.lastGap);
  const tool = useStudio((s) => s.tool);
  const setTool = useStudio((s) => s.setTool);
  const undo = useStudio((s) => s.undo);
  const redo = useStudio((s) => s.redo);
  const undoLen = useStudio((s) => s.undoStack.length);
  const redoLen = useStudio((s) => s.redoStack.length);
  const addTrack = useStudio((s) => s.addTrack);
  const ensureSpare = useStudio((s) => s.ensureSpareTracks);
  const videoRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLInputElement>(null);

  const pick = async (file: File | undefined, atGap = false) => {
    if (!file) return;
    const start = atGap ? (useStudio.getState().lastGap?.start ?? undefined) : 0;
    await importMediaFile(file, { start });
  };

  return (
    <div className="dock-safe shrink-0">
      <input
        ref={videoRef}
        type="file"
        accept="video/*,.mp4,.mov,.webm,.mkv,.m4v,.3gp"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          await pick(file, false);
        }}
      />
      <input
        ref={audioRef}
        type="file"
        accept={MEDIA_ACCEPT}
        className="hidden"
        multiple
        onChange={async (e) => {
          const files = [...(e.target.files ?? [])];
          e.target.value = "";
          for (const file of files) await pick(file, false);
        }}
      />
      <div className="flex items-center gap-0.5 overflow-x-auto border-t border-border/50 px-1 py-0.5">
        <HistoryBtn label="<" title="Отменить" disabled={!undoLen} onClick={undo} />
        <HistoryBtn label=">" title="Вернуть" disabled={!redoLen} onClick={redo} />
        <DockBtn label="Видео" onClick={() => videoRef.current?.click()}>
          <Film />
        </DockBtn>
        <DockBtn label="Аудио" onClick={() => audioRef.current?.click()}>
          <Upload />
        </DockBtn>
        <DockBtn label="Ножницы" onClick={() => actionSplitAtPlayhead()}>
          <Scissors />
        </DockBtn>
        <DockBtn
          label="Скорость"
          active={tool === "speed"}
          onClick={() => {
            setTool(tool === "speed" ? "pointer" : "speed");
            if (!clipId) return;
            setTab("clip");
          }}
        >
          <Timer />
        </DockBtn>
        <DockBtn label={lastGap ? "В вырез" : "Кусок"} onClick={() => actionDeleteSelected()}>
          <Trash2 />
        </DockBtn>
        <DockBtn
          label="Дорожка"
          onClick={() => {
            addTrack();
            ensureSpare(5);
          }}
        >
          <Plus />
        </DockBtn>
        <button
          type="button"
          className={cn(
            "ml-auto flex h-9 items-center gap-1 rounded-md px-2 text-xs",
            panelOpen ? "text-foreground" : "text-muted-foreground",
          )}
          onClick={() => setPanelOpen(!panelOpen)}
        >
          {panelOpen ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
          Ещё
        </button>
      </div>
      {panelOpen ? (
        <div className="flex h-[min(236px,36vh)] flex-col border-t border-border/50">
          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="flex min-h-0 flex-1 flex-col">
            <div className="flex items-center gap-2 overflow-x-auto px-2 py-1">
              <TabsList>
                <TabsTrigger value="cut">Нарезка</TabsTrigger>
                <TabsTrigger value="split">Стемы</TabsTrigger>
                <TabsTrigger value="clip">Клип</TabsTrigger>
                <TabsTrigger value="mixer">Микшер</TabsTrigger>
              </TabsList>
              {clipId ? <span className="text-[10px] text-muted-foreground">Клип выбран</span> : null}
            </div>
            <TabsContent value="cut" className="mt-0 min-h-0 flex-1 overflow-y-auto px-3 pb-2">
              <CutPanel />
            </TabsContent>
            <TabsContent value="mixer" className="mt-0 min-h-0 flex-1 overflow-x-auto px-2 pb-2">
              <Mixer />
            </TabsContent>
            <TabsContent value="clip" className="mt-0 min-h-0 flex-1 overflow-y-auto px-3 pb-2">
              <ClipInspector />
            </TabsContent>
            <TabsContent value="split" className="mt-0 min-h-0 flex-1 overflow-y-auto px-3 pb-2">
              <SplitPanel />
            </TabsContent>
          </Tabs>
        </div>
      ) : null}
    </div>
  );
}

function DockBtn({
  label,
  onClick,
  children,
  active,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-9 min-w-11 flex-col items-center justify-center gap-0.5 rounded-md px-1.5 transition-colors duration-150 hover:bg-foreground/8 hover:text-foreground",
        active ? "bg-foreground/10 text-play" : "text-muted-foreground",
      )}
    >
      <span className="[&_svg]:size-3.5">{children}</span>
      <span className="text-[9px] font-medium leading-none">{label}</span>
    </button>
  );
}

function CutPanel() {
  const markA = useStudio((s) => s.markA);
  const markB = useStudio((s) => s.markB);
  const lastGap = useStudio((s) => s.lastGap);
  const clip = useStudio((s) => s.clips.find((c) => c.id === s.selectedClipId));
  const videoRef = useRef<HTMLInputElement>(null);

  return (
    <div className="max-w-xl space-y-2 pt-0.5">
      <div>
        <h3 className="text-sm font-semibold">Нарезка</h3>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
          Ползунок на начало — ножницы. На конец — ещё раз. Удали середину. Случайный клик дорожку не двигает.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <Button className="h-9" variant="secondary" onClick={() => actionSplitAtPlayhead()}>
          <Scissors /> По ползунку
        </Button>
        <Button className="h-9" variant="secondary" onClick={() => actionDeleteSelected()} disabled={!clip}>
          <Trash2 /> Удалить кусок
        </Button>
        <Button className="h-9" variant="secondary" onClick={() => actionSetMark("a")}>
          Метка A {markA != null ? markA.toFixed(2) : ""}
        </Button>
        <Button className="h-9" variant="secondary" onClick={() => actionSetMark("b")}>
          Метка B {markB != null ? markB.toFixed(2) : ""}
        </Button>
        <Button className="h-9" onClick={() => actionCutMarked()} disabled={markA == null || markB == null}>
          Вырезать A–B
        </Button>
        <Button className="h-9" variant="secondary" onClick={() => actionLiftMarked()} disabled={markA == null || markB == null}>
          На новую дорожку
        </Button>
      </div>
      <input
        ref={videoRef}
        type="file"
        accept="audio/*,video/*"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          const start = useStudio.getState().lastGap?.start ?? 0;
          await importMediaFile(file, { start });
        }}
      />
      <Button className="h-9 w-full" variant={lastGap ? "default" : "outline"} onClick={() => videoRef.current?.click()}>
        <Film /> {lastGap ? "Вставить в вырез" : "Добавить файл на следующую дорожку"}
      </Button>
    </div>
  );
}

function Mixer() {
  const tracks = useStudio((s) => s.tracks);
  const master = useStudio((s) => s.masterGain);
  const setMaster = useStudio((s) => s.setMaster);
  const clips = useStudio((s) => s.clips);
  const occupied = new Set(clips.map((c) => c.trackId));
  const live = tracks.filter((t) => occupied.has(t.id));
  const shown = live.length ? live : tracks.slice(0, 8);
  return (
    <div className="flex h-full min-w-max gap-2 pt-1">
      {shown.map((t) => (
        <MixerStrip key={t.id} track={t} />
      ))}
      <div className="flex w-20 flex-col items-center gap-1 rounded-lg bg-foreground/6 p-1.5">
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Master</span>
        <Fader value={master} max={MASTER_VOL_MAX} onChange={setMaster} />
        <span className={cn("font-mono text-[10px] tabular", master > 1.01 ? "text-play" : "text-muted-foreground")}>
          {Math.round(master * 100)}
        </span>
      </div>
    </div>
  );
}

function MixerStrip({ track }: { track: Track }) {
  const update = useStudio((s) => s.updateTrack);
  return (
    <div className="flex w-20 flex-col items-center gap-1 rounded-lg bg-foreground/6 p-1.5">
      <span className="w-full truncate text-center text-[11px] font-medium">{track.name}</span>
      <Fader value={track.volume} max={TRACK_VOL_MAX} onChange={(v) => update(track.id, { volume: v })} />
      <span className={cn("font-mono text-[10px] tabular", track.volume > 1.01 ? "text-play" : "text-muted-foreground")}>
        {Math.round(track.volume * 100)}
      </span>
      <div className="flex w-full gap-1">
        <button
          type="button"
          className={cn(
            "h-7 flex-1 rounded-md text-[10px] font-semibold",
            track.mute ? "bg-foreground text-background" : "bg-foreground/10 text-muted-foreground",
          )}
          onClick={() => update(track.id, { mute: !track.mute })}
        >
          M
        </button>
        <button
          type="button"
          className={cn(
            "h-7 flex-1 rounded-md text-[10px] font-semibold",
            track.solo ? "bg-play text-background" : "bg-foreground/10 text-muted-foreground",
          )}
          onClick={() => update(track.id, { solo: !track.solo })}
        >
          S
        </button>
      </div>
      <Label className="text-[10px]">Pan</Label>
      <Slider min={-1} max={1} step={0.01} value={[track.pan]} onValueChange={([v]) => update(track.id, { pan: v ?? 0 })} />
    </div>
  );
}

function Fader({ value, onChange, max = TRACK_VOL_MAX }: { value: number; onChange: (v: number) => void; max?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const setFromY = (clientY: number) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const t = 1 - (clientY - rect.top) / Math.max(1, rect.height);
    onChange(Math.min(max, Math.max(0, t * max)));
  };
  const onPointer = (e: PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setFromY(e.clientY);
  };
  const unity = (1 / max) * 100;
  return (
    <div
      ref={ref}
      className="relative h-20 w-8 touch-none rounded-full bg-foreground/10"
      onPointerDown={onPointer}
      onPointerMove={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) setFromY(e.clientY);
      }}
      role="slider"
      aria-valuemin={0}
      aria-valuemax={Math.round(max * 100)}
      aria-valuenow={Math.round(value * 100)}
      aria-label="Громкость"
      tabIndex={0}
    >
      <div
        className="pointer-events-none absolute left-1 right-1 border-t border-foreground/30"
        style={{ bottom: `${unity}%` }}
      />
      <div
        className="absolute bottom-0 left-0 right-0 rounded-full bg-primary"
        style={{ height: `${Math.round((value / max) * 100)}%` }}
      />
      <div
        className="absolute left-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary bg-foreground"
        style={{ top: `${(1 - value / max) * 100}%` }}
      />
    </div>
  );
}

function ClipInspector() {
  const clip = useStudio((s) => s.clips.find((c) => c.id === s.selectedClipId));
  const projectBpm = useStudio((s) => s.bpm);
  const update = useStudio((s) => s.updateClip);
  const remove = useStudio((s) => s.removeClip);
  const duplicate = useStudio((s) => s.duplicateClip);
  const setClipRate = useStudio((s) => s.setClipRate);
  const setTool = useStudio((s) => s.setTool);
  const keyRoot = useStudio((s) => s.keyRoot);
  const keyMode = useStudio((s) => s.keyMode);
  const [semis, setSemis] = useState(0);
  if (!clip) {
    return (
      <p className="max-w-lg pt-2 text-sm text-muted-foreground">
        Выберите клип. BPM и скорость — только у этого куска, не у всего проекта.
      </p>
    );
  }
  const rate = clipRate(clip);
  const tempo = clipBpm(clip, projectBpm);
  return (
    <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
      <Field label={`BPM клипа${clip.nativeBpm ? ` · было ${Math.round(clip.nativeBpm)}` : ""}`}>
        <div className="flex items-center gap-2">
          <Gauge className="size-4 shrink-0 text-muted-foreground" />
          <BpmInput value={tempo} onCommit={(v) => actionSetClipBpm(v)} className="h-8 w-16" ariaLabel="BPM клипа" />
          <Button
            size="sm"
            variant="secondary"
            className="h-8"
            onClick={() => actionSetClipBpm(projectBpm)}
            title="Подогнать под сетку проекта"
          >
            Как сетка {Math.round(projectBpm)}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground">112, 140, любое — только этот кусок, тон сохраняется.</p>
      </Field>
      <Field label={`Скорость ×${rate.toFixed(2)}`}>
        <div className="flex items-center gap-2">
          <Timer className="size-4 shrink-0 text-muted-foreground" />
          <Slider
            min={RATE_MIN}
            max={RATE_MAX}
            step={0.01}
            value={[rate]}
            onValueCommit={([v]) => {
              if (v == null) return;
              setClipRate(clip.id, v);
            }}
          />
          <Button size="sm" variant="secondary" className="h-8" onClick={() => setTool("speed")}>
            ‹│›
          </Button>
        </div>
      </Field>
      <Field label="Громкость клипа">
        <div className="flex items-center gap-2">
          <Volume2 className="size-4 shrink-0 text-muted-foreground" />
          <input
            type="range"
            min={0}
            max={2}
            step={0.01}
            value={clip.gain}
            onChange={(e) => update(clip.id, { gain: Number(e.target.value) })}
            className="vol-range h-8 w-full"
            aria-label="Громкость клипа"
          />
          <span className={cn("w-10 text-right font-mono text-xs tabular", clip.gain > 1.01 && "text-play")}>
            {Math.round(clip.gain * 100)}
          </span>
        </div>
      </Field>
      <Field label="Затухание слева">
        <Slider
          min={0}
          max={Math.max(0.05, clip.duration / 2)}
          step={0.01}
          value={[clip.fadeIn]}
          onValueChange={([v]) => update(clip.id, { fadeIn: v ?? 0 })}
        />
        <span className="font-mono text-xs tabular text-muted-foreground">{clip.fadeIn.toFixed(2)} с</span>
      </Field>
      <Field label="Затухание справа">
        <Slider
          min={0}
          max={Math.max(0.05, clip.duration / 2)}
          step={0.01}
          value={[clip.fadeOut]}
          onValueChange={([v]) => update(clip.id, { fadeOut: v ?? 0 })}
        />
        <span className="font-mono text-xs tabular text-muted-foreground">{clip.fadeOut.toFixed(2)} с</span>
      </Field>
      <Field label={`Тональность ${formatKey(keyRoot, keyMode)}`}>
        <div className="flex items-center gap-2">
          <Slider min={-12} max={12} step={1} value={[semis]} onValueChange={([v]) => setSemis(v ?? 0)} />
          <span className="w-8 text-right font-mono text-xs">{semis > 0 ? `+${semis}` : semis}</span>
          <Button size="sm" disabled={semis === 0} onClick={() => void actionPitch(semis).then(() => setSemis(0))}>
            Применить
          </Button>
        </div>
      </Field>
      <div className="flex flex-wrap gap-1.5 sm:col-span-2 lg:col-span-3">
        <Button size="sm" variant="secondary" className="h-8" onClick={() => void actionDetectKey()}>
          <Music2 /> Тональность
        </Button>
        <Button size="sm" variant="secondary" className="h-8" onClick={() => void actionDetectBpm()}>
          <Gauge /> Считать BPM
        </Button>
        <Button size="sm" variant="secondary" className="h-8" onClick={() => void actionReverse()}>
          <FlipHorizontal2 /> Реверс
        </Button>
        <Button size="sm" variant="secondary" className="h-8" onClick={() => actionSplitAtPlayhead()}>
          <Scissors /> По ползунку
        </Button>
        <Button size="sm" variant="secondary" className="h-8" onClick={() => duplicate(clip.id)}>
          Дублировать
        </Button>
        <Button size="sm" variant="secondary" className="h-8" onClick={() => void actionDenoise()}>
          <AudioLines /> Шум
        </Button>
        <Button size="sm" variant="secondary" className="h-8" onClick={() => void actionEnhance()}>
          <Sparkles /> Улучшить
        </Button>
        <Button size="sm" variant="secondary" className="h-8" onClick={() => void actionNormalize()}>
          <WandSparkles /> Норма
        </Button>
        <Button size="sm" variant="outline" className="h-8" onClick={() => remove(clip.id)}>
          Удалить клип
        </Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function SplitPanel() {
  const clip = useStudio((s) => s.clips.find((c) => c.id === s.selectedClipId));
  return (
    <div className="max-w-xl space-y-2.5 pt-0.5">
      <div>
        <h3 className="text-sm font-semibold">Стемы</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Выбранный клип разбирается на соседние дорожки без пустых промежутков. Минус — без слов, бас — отдельно от
          ударных.
        </p>
      </div>
      {!clip ? (
        <p className="text-sm text-muted-foreground">Сначала выберите клип, который нужно разобрать.</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => void actionSplit("vocals-instrumental")}
            className="rounded-lg border border-border/70 bg-foreground/6 p-2.5 text-left transition-colors duration-150 hover:border-primary/50 hover:bg-foreground/10"
          >
            <SplitSquareVertical className="mb-1.5 size-4 text-primary" />
            <div className="text-sm font-semibold">Акапелла + минус</div>
            <p className="mt-0.5 text-xs text-muted-foreground">Две дорожки подряд. Песня заменяется.</p>
          </button>
          <button
            type="button"
            onClick={() => void actionSplit("four-stems")}
            className="rounded-lg border border-border/70 bg-foreground/6 p-2.5 text-left transition-colors duration-150 hover:border-primary/50 hover:bg-foreground/10"
          >
            <SplitSquareVertical className="mb-1.5 size-4 text-primary" />
            <div className="text-sm font-semibold">Вокал · ударные · бас</div>
            <p className="mt-0.5 text-xs text-muted-foreground">Четыре дорожки: вокал, drums, бас, остальное</p>
          </button>
        </div>
      )}
    </div>
  );
}

export function BusyOverlay() {
  const busy = useStudio((s) => s.busy);
  const hidden = useStudio((s) => s.busyHidden);
  const hideBusy = useStudio((s) => s.hideBusy);
  if (!busy || hidden) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[5.75rem] z-50 flex justify-center px-3">
      <div className="pointer-events-auto w-[min(22rem,calc(100%-2rem))] rounded-xl glass-strong p-4 shadow-panel">
        <p className="text-sm font-medium">{busy.label}</p>
        <Progress value={Math.round(busy.progress * 100)} className="mt-3" />
        <p className="mt-2 font-mono text-xs tabular text-muted-foreground">{Math.round(busy.progress * 100)}%</p>
        <div className="mt-3 flex gap-2">
          {busy.cancelable !== false ? (
            <Button className="h-9 flex-1" variant="secondary" onClick={() => cancelCurrentOp()}>
              Отменить
            </Button>
          ) : null}
          <Button className="h-9 flex-1" variant="ghost" onClick={() => hideBusy()}>
            Скрыть
          </Button>
        </div>
      </div>
    </div>
  );
}

import { useRef, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  Circle,
  Download,
  Gauge,
  Mic,
  Music2,
  Pause,
  Play,
  Repeat,
  Save,
  Scissors,
  Square,
  Timer,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PulseLogo } from "@/components/brand/logo";
import { engine } from "@/lib/audio/engine";
import { formatTime } from "@/lib/utils";
import { mixSnapshot, useStudio } from "@/lib/studio-store";
import { MASTER_VOL_MAX } from "@/lib/studio-types";
import { actionDetectKey, actionSetClipBpm, actionSplitAtPlayhead, formatKey } from "@/lib/clip-actions";
import { clipBpm, clipRate } from "@/lib/clip-time";
import { usePlayheadClock, usePlaying } from "@/hooks/use-playhead";
import { cn } from "@/lib/utils";
import { ExportDialog } from "./export-dialog";
import { VolumeSlider } from "./volume-slider";
import { BpmInput } from "./bpm-input";
import { UiModeSwitch } from "./ui-mode-switch";

export function TopBar() {
  const name = useStudio((s) => s.name);
  const setName = useStudio((s) => s.setName);
  const persist = useStudio((s) => s.persist);
  const undo = useStudio((s) => s.undo);
  const redo = useStudio((s) => s.redo);
  const undoLen = useStudio((s) => s.undoStack.length);
  const redoLen = useStudio((s) => s.redoStack.length);
  const [exportOpen, setExportOpen] = useState(false);

  return (
    <header className="glass-bar flex h-10 shrink-0 items-center gap-1 border-b border-border/60 px-2 sm:px-3">
      <Link to="/" className="shrink-0" aria-label="На главную">
        <PulseLogo className="text-sm" markClassName="size-5" />
      </Link>
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => persist()}
        className="h-7 min-w-0 flex-1 border-transparent bg-transparent px-2 text-sm font-medium hover:bg-foreground/6 focus-visible:bg-foreground/8 sm:max-w-52"
      />
      <HistoryBtn label="<" title="Отменить" disabled={!undoLen} onClick={undo} />
      <HistoryBtn label=">" title="Вернуть" disabled={!redoLen} onClick={redo} />
      <UiModeSwitch compact />
      <Button
        size="icon"
        variant="ghost"
        className="size-8 shrink-0"
        title="Сохранить"
        aria-label="Сохранить проект"
        onClick={() => {
          persist();
          toast.success("Проект сохранён");
        }}
      >
        <Save />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className="size-8 shrink-0 sm:hidden"
        onClick={() => setExportOpen(true)}
        aria-label="Экспорт"
      >
        <Download />
      </Button>
      <Button size="sm" className="hidden h-7 sm:inline-flex" onClick={() => setExportOpen(true)}>
        <Download />
        Экспорт
      </Button>
      <ExportDialog open={exportOpen} onOpenChange={setExportOpen} />
    </header>
  );
}

export function HistoryBtn({
  label,
  title,
  disabled,
  onClick,
}: {
  label: string;
  title: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      size="icon"
      variant="secondary"
      className="size-8 shrink-0 font-mono text-sm"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
    >
      {label}
    </Button>
  );
}

function PlayheadClock() {
  const ref = useRef<HTMLSpanElement>(null);
  usePlayheadClock(ref, formatTime);
  return (
    <span
      ref={ref}
      className="min-w-[4.2rem] shrink-0 font-mono text-xs tabular text-foreground sm:min-w-[5rem]"
    >
      {formatTime(engine.getPlayhead())}
    </span>
  );
}

export function Transport() {
  const bpm = useStudio((s) => s.bpm);
  const setBpm = useStudio((s) => s.setBpm);
  const keyRoot = useStudio((s) => s.keyRoot);
  const keyMode = useStudio((s) => s.keyMode);
  const loopEnabled = useStudio((s) => s.loopEnabled);
  const setLoop = useStudio((s) => s.setLoop);
  const tracks = useStudio((s) => s.tracks);
  const selectedTrackId = useStudio((s) => s.selectedTrackId);
  const selectedClipId = useStudio((s) => s.selectedClipId);
  const clip = useStudio((s) => s.clips.find((c) => c.id === s.selectedClipId));
  const tool = useStudio((s) => s.tool);
  const setTool = useStudio((s) => s.setTool);
  const master = useStudio((s) => s.masterGain);
  const setMaster = useStudio((s) => s.setMaster);
  const { playing, recording } = usePlaying();
  const importBuffer = useStudio((s) => s.importBuffer);
  const [metro, setMetro] = useState(engine.metronome);

  const clipTempo = clip ? clipBpm(clip, bpm) : null;
  const displayBpm = clipTempo ?? bpm;
  const rate = clip ? clipRate(clip) : 1;
  const bpmTarget = clip || selectedTrackId ? "clip" : "grid";

  const togglePlay = async () => {
    await engine.resume();
    if (engine.playing) engine.pause();
    else await engine.play(mixSnapshot());
  };

  const toggleRec = async () => {
    if (engine.recording) {
      engine.stopRecording();
      return;
    }
    let armed =
      tracks.find((t) => t.armed) ??
      tracks.find((t) => t.id === selectedTrackId) ??
      tracks[0];
    if (!armed) {
      const id = useStudio.getState().addTrack("Запись");
      armed = useStudio.getState().tracks.find((t) => t.id === id) ?? useStudio.getState().tracks[0];
    }
    if (!armed) {
      toast.error("Нет дорожки для записи");
      return;
    }
    try {
      await engine.play(mixSnapshot());
      await engine.startRecording(armed.id, async (blob, startedAt, trackId) => {
        const audioCtx = engine.ensure();
        const buf = await audioCtx.decodeAudioData(await blob.arrayBuffer());
        await importBuffer(buf, "Запись", trackId, startedAt, "record");
        toast.success("Запись добавлена");
      });
    } catch {
      toast.error("Нет доступа к микрофону");
    }
  };

  const commitBpm = (next: number) => {
    if (bpmTarget === "clip") actionSetClipBpm(next);
    else setBpm(next);
  };

  return (
    <div className="shrink-0 overflow-x-auto">
      <div className="flex h-11 items-center gap-0.5 px-1.5 sm:gap-1 sm:px-2">
        <Button
          size="icon"
          variant={recording ? "record" : "ghost"}
          className="size-9 shrink-0"
          onClick={() => void toggleRec()}
          aria-label="Запись"
        >
          {recording ? <Circle className="fill-current" /> : <Mic />}
        </Button>
        <Button
          size="icon"
          variant="play"
          className="size-9 shrink-0"
          onClick={() => void togglePlay()}
          aria-label={playing ? "Пауза" : "Играть"}
        >
          {playing ? <Pause /> : <Play className="ml-0.5" />}
        </Button>
        <Button size="icon" variant="ghost" className="size-9 shrink-0" onClick={() => engine.stop()} aria-label="Стоп">
          <Square className="size-3.5 fill-current" />
        </Button>
        <PlayheadClock />
        <Button
          size="icon"
          variant="secondary"
          className="size-9 shrink-0"
          onClick={() => actionSplitAtPlayhead()}
          aria-label="Ножницы по ползунку"
          title="Разрезать клип по ползунку"
        >
          <Scissors />
        </Button>
        <Button
          size="icon"
          variant={tool === "razor" ? "secondary" : "ghost"}
          className={cn("size-9 shrink-0", tool === "razor" && "text-primary")}
          onClick={() => setTool(tool === "razor" ? "pointer" : "razor")}
          aria-label="Режим лезвия"
          title="Тап по клипу режет в этом месте"
        >
          <Scissors className="rotate-90" />
        </Button>
        <Button
          size="icon"
          variant={tool === "speed" ? "secondary" : "ghost"}
          className={cn("size-9 shrink-0", tool === "speed" && "text-play")}
          onClick={() => {
            setTool(tool === "speed" ? "pointer" : "speed");
            if (!selectedClipId) toast.message("Выбери клип — слева на конце появится ‹│›");
          }}
          aria-label="Скорость клипа"
          title="Скорость: зажми ‹│› на конце клипа и тяни"
        >
          <Timer />
        </Button>
        <div className="mx-1 hidden h-6 w-px shrink-0 bg-border sm:block" />
        <label className="flex shrink-0 items-center gap-0.5 text-[10px] text-muted-foreground">
          <Gauge className="size-3" />
          {bpmTarget === "clip" ? "Клип" : "Сетка"}
        </label>
        <Button
          size="icon"
          variant="ghost"
          className="size-7 shrink-0"
          onClick={() => commitBpm(Math.round(displayBpm) - 1)}
          aria-label="BPM минус"
        >
          −
        </Button>
        <BpmInput
          value={displayBpm}
          onArm={() => useStudio.getState().snapshot()}
          onCommit={commitBpm}
          ariaLabel={bpmTarget === "clip" ? "BPM клипа" : "BPM сетки"}
        />
        <Button
          size="icon"
          variant="ghost"
          className="size-7 shrink-0"
          onClick={() => commitBpm(Math.round(displayBpm) + 1)}
          aria-label="BPM плюс"
        >
          +
        </Button>
        {clip && Math.abs(rate - 1) > 0.01 ? (
          <span className="shrink-0 font-mono text-[10px] tabular text-play">×{rate.toFixed(2)}</span>
        ) : null}
        <button
          type="button"
          className="ml-1 flex h-7 shrink-0 items-center gap-1 rounded-md bg-foreground/6 px-1.5 font-mono text-xs text-foreground"
          title="Определить тональность"
          onClick={() => void actionDetectKey()}
        >
          <Music2 className="size-3 text-muted-foreground" />
          {formatKey(keyRoot, keyMode)}
        </button>
        <div className="ml-1 min-w-[5rem] max-w-[8rem] flex-1">
          <VolumeSlider
            compact
            value={master}
            max={MASTER_VOL_MAX}
            onChange={setMaster}
            ariaLabel="Общая громкость"
          />
        </div>
        <Button
          size="sm"
          variant={loopEnabled ? "secondary" : "ghost"}
          className={cn("h-7 shrink-0 px-2 text-xs", loopEnabled && "text-play")}
          onClick={() => setLoop({ loopEnabled: !loopEnabled })}
        >
          <Repeat className="size-3.5" />
        </Button>
        <Button
          size="sm"
          variant={metro ? "secondary" : "ghost"}
          className={cn("h-7 shrink-0 px-1.5 text-[10px]", metro && "text-play")}
          onClick={() => {
            engine.metronome = !engine.metronome;
            setMetro(engine.metronome);
            toast.message(engine.metronome ? "Метроном включён" : "Метроном выключен");
          }}
        >
          Metro
        </Button>
      </div>
    </div>
  );
}

export function IconBtn({ children, onClick, title }: { children: ReactNode; onClick: () => void; title: string }) {
  return (
    <Button size="icon-sm" variant="ghost" onClick={onClick} title={title} aria-label={title}>
      {children}
    </Button>
  );
}

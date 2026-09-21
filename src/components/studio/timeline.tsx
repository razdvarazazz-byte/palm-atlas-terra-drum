import {
  memo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { GripVertical } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { engine } from "@/lib/audio/engine";
import { getAudioBuffer } from "@/lib/audio/buffers";
import { isMediaFile } from "@/lib/audio/media";
import { useStudio } from "@/lib/studio-store";
import { importMediaFile } from "@/lib/clip-actions";
import { clipRate, RATE_MAX, RATE_MIN, sourceLength } from "@/lib/clip-time";
import { useSyncedPlayheads } from "@/hooks/use-playhead";
import { usePinchZoom } from "@/hooks/use-pinch-zoom";
import { Waveform } from "./waveform";
import type { Clip, Track } from "@/lib/studio-types";
import { SPARE_LANES } from "@/lib/studio-types";

const CLIP_ARM_PX = 5;

function trackHeight() {
  if (typeof window === "undefined") return 48;
  const v = getComputedStyle(document.documentElement).getPropertyValue("--track-h");
  const n = parseFloat(v);
  return Number.isFinite(n) && n > 0 ? n : 48;
}

function rulerHeight() {
  if (typeof window === "undefined") return 22;
  const v = getComputedStyle(document.documentElement).getPropertyValue("--ruler-h");
  const n = parseFloat(v);
  return Number.isFinite(n) && n > 0 ? n : 22;
}

export function Timeline() {
  const tracks = useStudio((s) => s.tracks);
  const clips = useStudio((s) => s.clips);
  const bpm = useStudio((s) => s.bpm);
  const zoom = useStudio((s) => s.zoom);
  const setZoom = useStudio((s) => s.setZoom);
  const selectedClipId = useStudio((s) => s.selectedClipId);
  const selectedTrackId = useStudio((s) => s.selectedTrackId);
  const loopEnabled = useStudio((s) => s.loopEnabled);
  const loopStart = useStudio((s) => s.loopStart);
  const loopEnd = useStudio((s) => s.loopEnd);
  const markA = useStudio((s) => s.markA);
  const markB = useStudio((s) => s.markB);
  const lastGap = useStudio((s) => s.lastGap);
  const tool = useStudio((s) => s.tool);
  const board = useRef<HTMLDivElement>(null);
  const heads = useRef<HTMLDivElement>(null);
  const syncLock = useRef<"none" | "lane" | "head">("none");
  const [pinching, setPinching] = useState(false);
  const [draggingTrackId, setDraggingTrackId] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [clipDragging, setClipDragging] = useState<string | null>(null);
  const { lineRef, headRef } = useSyncedPlayheads(zoom, board, true);

  const duration = Math.max(16, clips.reduce((m, c) => Math.max(m, c.start + c.duration), 0) + 8);
  const width = duration * zoom;
  const regionLo = markA != null && markB != null ? Math.min(markA, markB) : null;
  const regionHi = markA != null && markB != null ? Math.max(markA, markB) : null;
  const stackH = Math.max(1, tracks.length) * trackHeight();
  const locked = pinching || draggingTrackId != null;
  const dragging = draggingTrackId != null || clipDragging != null;
  const x0 = Math.max(0, engine.getPlayhead()) * zoom;

  usePinchZoom(board, zoom, setZoom, setPinching);

  const syncFromBoard = () => {
    const el = board.current;
    if (!el || syncLock.current === "head") return;
    syncLock.current = "lane";
    if (heads.current) heads.current.scrollTop = el.scrollTop;
    syncLock.current = "none";
  };

  const syncFromHeads = () => {
    const el = heads.current;
    if (!el || syncLock.current === "lane") return;
    syncLock.current = "head";
    if (board.current) board.current.scrollTop = el.scrollTop;
    syncLock.current = "none";
  };

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <div className="flex w-lane-head shrink-0 flex-col border-r border-border/70 glass-track">
        <div className="flex h-ruler items-center px-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Дорожки
        </div>
        <div ref={heads} className="min-h-0 flex-1 overflow-y-auto overscroll-contain" onScroll={syncFromHeads}>
          <div className="relative" style={{ minHeight: stackH }}>
            {dropIndex != null && draggingTrackId ? (
              <div
                className="pointer-events-none absolute left-1 right-1 z-30 h-0.5 rounded-full bg-play"
                style={{ top: dropIndex * trackHeight() }}
              />
            ) : null}
            {tracks.map((track, index) => (
              <TrackHeader
                key={track.id}
                track={track}
                index={index}
                selected={selectedTrackId === track.id}
                lifted={draggingTrackId === track.id}
                draggingId={draggingTrackId}
                setDraggingId={setDraggingTrackId}
                dropIndex={dropIndex}
                setDropIndex={setDropIndex}
                listRef={heads}
              />
            ))}
          </div>
        </div>
      </div>
      <div
        ref={board}
        className={cn("timeline-lanes min-h-0 min-w-0 flex-1 overflow-auto", dragging && "is-dragging")}
        onScroll={syncFromBoard}
      >
        <div className="relative" style={{ width, minHeight: stackH + rulerHeight() }}>
          <div className="sticky top-0 z-40 h-ruler overflow-hidden border-b border-border/70 glass-bar">
            <Ruler bpm={bpm} zoom={zoom} duration={duration} width={width} />
            <div
              ref={headRef}
              className="pointer-events-none absolute top-0 z-30 h-ruler w-0.5 bg-play will-change-transform"
              style={{ left: 0, transform: `translate3d(${x0}px,0,0)` }}
            >
              <div className="absolute -left-1.5 top-0 size-2.5 rotate-45 bg-play" />
            </div>
          </div>
          <div className="relative select-none" style={{ width, minHeight: Math.max(stackH, 1) }}>
            {loopEnabled && (
              <div
                className="pointer-events-none absolute top-0 z-10 border-x border-primary/50 bg-primary/5"
                style={{
                  left: loopStart * zoom,
                  width: Math.max(2, (loopEnd - loopStart) * zoom),
                  height: stackH,
                }}
              />
            )}
            {regionLo != null && regionHi != null && (
              <div
                className="pointer-events-none absolute top-0 z-10 border-x border-play/70 bg-play/10"
                style={{
                  left: regionLo * zoom,
                  width: Math.max(2, (regionHi - regionLo) * zoom),
                  height: stackH,
                }}
              />
            )}
            {lastGap && (
              <div
                className="pointer-events-none absolute top-0 z-[9] border border-dashed border-primary/60 bg-primary/10"
                style={{
                  left: lastGap.start * zoom,
                  width: Math.max(4, lastGap.duration * zoom),
                  height: stackH,
                }}
              />
            )}
            {tracks.map((track) => (
              <TrackLane
                key={track.id}
                track={track}
                zoom={zoom}
                bpm={bpm}
                width={width}
                lifted={draggingTrackId === track.id}
                locked={locked}
                clipDragging={clipDragging}
              />
            ))}
            <div className="pointer-events-none absolute inset-0 z-20">
              {clips.map((clip) => {
                const trackIndex = Math.max(
                  0,
                  tracks.findIndex((t) => t.id === clip.trackId),
                );
                const track = tracks[trackIndex] ?? tracks[0];
                if (!track) return null;
                return (
                  <ClipView
                    key={clip.id}
                    clip={clip}
                    track={track}
                    trackIndex={trackIndex}
                    zoom={zoom}
                    selected={clip.id === selectedClipId}
                    locked={locked}
                    dragging={clipDragging === clip.id}
                    speedTool={tool === "speed"}
                    setClipDragging={setClipDragging}
                    lanesRef={board}
                  />
                );
              })}
            </div>
            {clips.length === 0 && (
              <div className="pointer-events-none absolute left-1/2 top-8 z-10 w-[min(22rem,86%)] -translate-x-1/2 rounded-lg border border-dashed border-border/80 glass-strong px-4 py-3 text-center text-sm text-muted-foreground">
                Кинь видео или аудио сюда. Первый файл — верхняя дорожка, следующий сразу под ним.
              </div>
            )}
            {markA != null && <MarkLine time={markA} zoom={zoom} label="A" height={stackH} />}
            {markB != null && <MarkLine time={markB} zoom={zoom} label="B" height={stackH} />}
            <div
              ref={lineRef}
              className="pointer-events-none absolute top-0 z-30 w-0.5 bg-play will-change-transform"
              data-playhead
              style={{
                left: 0,
                height: stackH,
                transform: `translate3d(${x0}px,0,0)`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function MarkLine({ time, zoom, label, height }: { time: number; zoom: number; label: string; height: number }) {
  return (
    <div className="pointer-events-none absolute top-0 z-20 w-px bg-foreground/70" style={{ left: time * zoom, height }}>
      <span className="absolute -left-2 top-1 rounded-sm bg-foreground px-1 font-mono text-[10px] leading-4 text-background">
        {label}
      </span>
    </div>
  );
}

function Ruler({ bpm, zoom, duration, width }: { bpm: number; zoom: number; duration: number; width: number }) {
  const beat = 60 / Math.max(20, bpm);
  const bar = beat * 4;
  const bars = Math.ceil(duration / bar);
  return (
    <button
      type="button"
      className="relative flex h-ruler w-full bg-transparent text-left"
      style={{ width }}
      onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        engine.seek(Math.max(0, x / zoom));
      }}
    >
      {Array.from({ length: bars + 1 }, (_, i) => (
        <span
          key={i}
          className="absolute top-0 h-ruler border-l border-border/70 pl-1.5 font-mono text-[10px] leading-[var(--ruler-h)] text-muted-foreground"
          style={{ left: i * bar * zoom }}
        >
          {i + 1}
        </span>
      ))}
    </button>
  );
}

const TrackHeader = memo(function TrackHeader({
  track,
  index,
  selected,
  lifted,
  draggingId,
  setDraggingId,
  dropIndex,
  setDropIndex,
  listRef,
}: {
  track: Track;
  index: number;
  selected: boolean;
  lifted: boolean;
  draggingId: string | null;
  setDraggingId: (id: string | null) => void;
  dropIndex: number | null;
  setDropIndex: (i: number | null) => void;
  listRef: { current: HTMLDivElement | null };
}) {
  const update = useStudio((s) => s.updateTrack);
  const select = useStudio((s) => s.selectTrack);
  const moveTrack = useStudio((s) => s.moveTrack);
  const snapshot = useStudio((s) => s.snapshot);
  const origin = useRef<{ x: number; y: number; pointerId: number; from: number } | null>(null);
  const dragging = useRef(false);
  const skipClick = useRef(false);
  const destRef = useRef(index);
  const [editing, setEditing] = useState(false);
  const [dy, setDy] = useState(0);

  const onDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest("input, [data-no-drag]")) return;
    origin.current = { x: e.clientX, y: e.clientY, pointerId: e.pointerId, from: index };
    dragging.current = false;
    setDy(0);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const o = origin.current;
    if (!o) return;
    const dx = e.clientX - o.x;
    const moveY = e.clientY - o.y;
    if (!dragging.current) {
      if (Math.hypot(dx, moveY) < 6) return;
      dragging.current = true;
      snapshot();
      setDraggingId(track.id);
      try {
        navigator.vibrate?.(10);
      } catch {
        /* ignore */
      }
    }
    setDy(moveY);
    const list = listRef.current;
    if (!list) return;
    const y = e.clientY - list.getBoundingClientRect().top + list.scrollTop;
    const next = Math.max(0, Math.min(useStudio.getState().tracks.length - 1, Math.floor(y / trackHeight())));
    destRef.current = next;
    setDropIndex(next);
    if (e.clientY > list.getBoundingClientRect().bottom - 28) list.scrollTop += 14;
    if (e.clientY < list.getBoundingClientRect().top + 28) list.scrollTop -= 14;
  };

  const onUp = () => {
    const o = origin.current;
    const was = dragging.current;
    const dest = destRef.current;
    origin.current = null;
    dragging.current = false;
    skipClick.current = was;
    setDy(0);
    setDraggingId(null);
    setDropIndex(null);
    if (was && dest !== o?.from) {
      moveTrack(track.id, dest, { snapshot: false });
    }
  };

  return (
    <div
      className={cn(
        "flex h-track touch-none items-center gap-1 border-b border-border/60 px-1.5",
        selected ? "bg-foreground/6" : "bg-transparent",
        lifted && "z-20 rounded-md glass-strong shadow-panel",
        draggingId && !lifted && "opacity-50",
      )}
      style={lifted ? { transform: `translateY(${dy}px)` } : undefined}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onClick={() => {
        if (skipClick.current) {
          skipClick.current = false;
          return;
        }
        if (!editing) select(track.id);
      }}
    >
      <span className={cn("h-4 w-1 shrink-0 rounded-full", colorBar(track.color))} />
      <span className="grid size-7 shrink-0 place-items-center text-muted-foreground/80" aria-hidden="true">
        <GripVertical className="size-3.5" />
      </span>
      {editing ? (
        <input
          autoFocus
          value={track.name}
          onChange={(e) => update(track.id, { name: e.target.value })}
          onBlur={() => setEditing(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === "Escape") setEditing(false);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className="min-w-0 flex-1 bg-transparent text-xs font-medium outline-none"
          aria-label={`Имя дорожки ${index + 1}`}
        />
      ) : (
        <button
          type="button"
          className="min-w-0 flex-1 truncate text-left text-xs font-medium"
          onDoubleClick={(e) => {
            e.stopPropagation();
            setEditing(true);
          }}
        >
          {track.name}
        </button>
      )}
      <HeaderBtn active={track.mute} title="Mute" onClick={() => update(track.id, { mute: !track.mute })}>
        M
      </HeaderBtn>
      <HeaderBtn active={track.solo} title="Solo" tone="play" onClick={() => update(track.id, { solo: !track.solo })}>
        S
      </HeaderBtn>
    </div>
  );
});

function HeaderBtn({
  active,
  onClick,
  children,
  tone = "muted",
  title,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  tone?: "muted" | "play" | "record";
  title: string;
}) {
  return (
    <button
      type="button"
      data-no-drag
      title={title}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "grid size-7 shrink-0 place-items-center rounded-md text-[10px] font-semibold",
        active
          ? tone === "play"
            ? "bg-play text-background"
            : tone === "record"
              ? "bg-record text-background"
              : "bg-foreground text-background"
          : "bg-foreground/8 text-muted-foreground",
      )}
    >
      {children}
    </button>
  );
}

const TrackLane = memo(function TrackLane({
  track,
  zoom,
  bpm,
  width,
  lifted,
  locked,
  clipDragging,
}: {
  track: Track;
  zoom: number;
  bpm: number;
  width: number;
  lifted: boolean;
  locked: boolean;
  clipDragging: string | null;
}) {
  const selectTrack = useStudio((s) => s.selectTrack);
  const [over, setOver] = useState(false);

  return (
    <div
      data-track-lane={track.id}
      className={cn(
        "relative h-track border-b border-border/60",
        over && "bg-primary/5",
        lifted && "z-20",
        clipDragging && "bg-foreground/[0.03]",
      )}
      style={{ width }}
      onClick={(e) => {
        if (locked || clipDragging) return;
        if ((e.target as HTMLElement).closest("[data-clip]")) return;
        selectTrack(track.id);
        const rect = e.currentTarget.getBoundingClientRect();
        const start = Math.max(0, (e.clientX - rect.left) / zoom);
        engine.seek(start);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setOver(false);
        const file = e.dataTransfer.files[0];
        if (!file || !isMediaFile(file)) {
          toast.error("Нужен аудио- или видеофайл");
          return;
        }
        const rect = e.currentTarget.getBoundingClientRect();
        const start = Math.max(0, (e.clientX - rect.left) / zoom);
        await importMediaFile(file, { trackId: track.id, start });
      }}
    >
      <Grid zoom={zoom} bpm={bpm} width={width} />
    </div>
  );
});

function Grid({ zoom, bpm, width }: { zoom: number; bpm: number; width: number }) {
  const beat = (60 / Math.max(20, bpm)) * zoom;
  return (
    <div
      className="pointer-events-none absolute inset-0 opacity-40"
      style={{
        backgroundImage: `linear-gradient(to right, color-mix(in oklab, var(--color-border) 80%, transparent) 1px, transparent 1px)`,
        backgroundSize: `${beat}px 100%`,
        width,
      }}
    />
  );
}

const ClipView = memo(function ClipView({
  clip,
  track,
  trackIndex,
  zoom,
  selected,
  locked,
  dragging,
  speedTool,
  setClipDragging,
  lanesRef,
}: {
  clip: Clip;
  track: Track;
  trackIndex: number;
  zoom: number;
  selected: boolean;
  locked: boolean;
  dragging: boolean;
  speedTool: boolean;
  setClipDragging: (id: string | null) => void;
  lanesRef: RefObject<HTMLDivElement | null>;
}) {
  const select = useStudio((s) => s.selectClip);
  const snapshot = useStudio((s) => s.snapshot);
  const tool = useStudio((s) => s.tool);
  const setDragging = useStudio((s) => s.setDragging);
  const buf = getAudioBuffer(clip.bufferId);
  const rate0 = clipRate(clip);
  const rootRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    mode: "move" | "in" | "out" | "stretch";
    startX: number;
    startY: number;
    start: number;
    duration: number;
    offset: number;
    rate: number;
    sourceLen: number;
    pointerId: number;
    trackIndex: number;
  } | null>(null);
  const armed = useRef(false);
  const skipClick = useRef(false);
  const grew = useRef(false);
  const [live, setLive] = useState<{
    start: number;
    duration: number;
    offset: number;
    trackIndex: number;
    rate: number;
  } | null>(null);

  const armMove = (target: HTMLElement, pointerId: number) => {
    if (armed.current) return;
    armed.current = true;
    select(clip.id);
    snapshot();
    setClipDragging(clip.id);
    setDragging(true);
    const node = rootRef.current ?? target;
    try {
      node.setPointerCapture(pointerId);
    } catch {
      /* already captured */
    }
    try {
      navigator.vibrate?.(8);
    } catch {
      /* ignore */
    }
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLElement>, mode: "move" | "in" | "out" | "stretch") => {
    e.stopPropagation();
    e.preventDefault();
    if (tool === "razor" || locked) return;
    if (e.pointerType === "touch" && e.isPrimary === false) return;
    drag.current = {
      mode,
      startX: e.clientX,
      startY: e.clientY,
      start: clip.start,
      duration: clip.duration,
      offset: clip.offset,
      rate: rate0,
      sourceLen: sourceLength(clip),
      pointerId: e.pointerId,
      trackIndex,
    };
    armed.current = false;
    grew.current = false;
    setLive(null);
    const node = rootRef.current ?? e.currentTarget;
    try {
      node.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    if (mode !== "move") {
      select(clip.id);
      snapshot();
      armed.current = true;
      setClipDragging(clip.id);
      setDragging(true);
    }
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLElement>) => {
    const d = drag.current;
    if (!d || locked) return;
    const dxPx = e.clientX - d.startX;
    const dyPx = e.clientY - d.startY;
    if (!armed.current) {
      if (Math.hypot(dxPx, dyPx) > CLIP_ARM_PX) {
        armMove(e.currentTarget, d.pointerId);
      } else {
        return;
      }
    }
    const dx = (e.clientX - d.startX) / zoom;
    if (d.mode === "move") {
      let start = Math.max(0, d.start + dx);
      const snap = useStudio.getState().snap;
      if (snap) {
        const beat = 60 / Math.max(20, useStudio.getState().bpm);
        start = Math.round(start / beat) * beat;
      }
      const lanes = lanesRef.current;
      let nextIndex = d.trackIndex;
      if (lanes) {
        const rect = lanes.getBoundingClientRect();
        const ruler = rulerHeight();
        const y = e.clientY - rect.top + lanes.scrollTop - ruler;
        const h = trackHeight();
        nextIndex = Math.max(0, Math.floor(y / h));
        const s = useStudio.getState();
        if (nextIndex >= s.tracks.length) {
          if (!grew.current) {
            s.addTrack(undefined, undefined, { snapshot: false });
            grew.current = true;
          }
        }
        const tracks = useStudio.getState().tracks;
        nextIndex = Math.max(0, Math.min(tracks.length - 1, nextIndex));
        if (e.clientX > rect.right - 36) lanes.scrollLeft += 18;
        if (e.clientX < rect.left + 36) lanes.scrollLeft -= 18;
        if (e.clientY > rect.bottom - 36) lanes.scrollTop += 14;
        if (e.clientY < rect.top + 36) lanes.scrollTop -= 14;
      }
      setLive({ start, duration: d.duration, offset: d.offset, trackIndex: nextIndex, rate: d.rate });
    } else if (d.mode === "in") {
      const minDx = -d.offset / d.rate;
      const delta = Math.min(d.duration - 0.05, Math.max(minDx, dx));
      setLive({
        start: d.start + delta,
        duration: d.duration - delta,
        offset: d.offset + delta * d.rate,
        trackIndex: d.trackIndex,
        rate: d.rate,
      });
    } else if (d.mode === "out") {
      const bufDur = buf?.duration ?? d.offset + d.sourceLen;
      const maxDur = Math.max(0.05, (bufDur - d.offset) / d.rate);
      setLive({
        start: d.start,
        duration: Math.min(maxDur, Math.max(0.05, d.duration + dx)),
        offset: d.offset,
        trackIndex: d.trackIndex,
        rate: d.rate,
      });
    } else {
      const nextDur = Math.max(0.05, d.duration + dx);
      const nextRate = Math.min(RATE_MAX, Math.max(RATE_MIN, d.sourceLen / nextDur));
      setLive({
        start: d.start,
        duration: d.sourceLen / nextRate,
        offset: d.offset,
        trackIndex: d.trackIndex,
        rate: nextRate,
      });
    }
  };

  const onPointerUp = () => {
    const d = drag.current;
    skipClick.current = armed.current;
    const next = live;
    drag.current = null;
    if (armed.current && next) {
      const tracks = useStudio.getState().tracks;
      const trackId = tracks[next.trackIndex]?.id ?? clip.trackId;
      if (d?.mode === "move") {
        useStudio.getState().moveClip(clip.id, { start: next.start, trackId }, { snapshot: false });
      } else if (d?.mode === "stretch") {
        useStudio.getState().updateClip(clip.id, {
          duration: next.duration,
          rate: next.rate,
          preservePitch: false,
        });
      } else {
        useStudio.getState().updateClip(clip.id, {
          start: next.start,
          duration: next.duration,
          offset: next.offset,
        });
      }
      useStudio.getState().ensureSpareTracks(SPARE_LANES);
    }
    setClipDragging(null);
    setDragging(false);
    armed.current = false;
    setLive(null);
  };

  const start = live?.start ?? clip.start;
  const duration = live?.duration ?? clip.duration;
  const offset = live?.offset ?? clip.offset;
  const rate = live?.rate ?? rate0;
  const idx = live?.trackIndex ?? trackIndex;
  const h = trackHeight();
  const showStretch = selected || speedTool;
  const stretching = drag.current?.mode === "stretch" || (live != null && Math.abs(rate - rate0) > 0.001);

  return (
    <div
      className={cn(
        "pointer-events-auto absolute overflow-hidden rounded-md border clip-h touch-none",
        selected ? "z-10 border-foreground" : "border-transparent",
        clip.muted && "opacity-40",
        fillClip(track.color),
        tool === "razor" && "cursor-cell",
        dragging && "z-30 scale-[1.02] shadow-panel ring-1 ring-foreground/40",
      )}
      data-clip={clip.id}
      ref={rootRef}
      onClick={(e) => {
        e.stopPropagation();
        if (skipClick.current) {
          skipClick.current = false;
          return;
        }
        const rect = e.currentTarget.getBoundingClientRect();
        const t = clip.start + ((e.clientX - rect.left) / Math.max(1, rect.width)) * clip.duration;
        engine.seek(t);
        if (tool === "razor") {
          const id = useStudio.getState().splitClipAt(clip.id, t);
          if (id) toast.success("Разрезано");
          return;
        }
        select(clip.id);
      }}
      style={{
        left: 0,
        top: 0,
        width: Math.max(8, duration * zoom),
        transform: `translate3d(${start * zoom}px, ${idx * h + 3}px, 0)`,
        willChange: dragging ? "transform" : undefined,
      }}
      onPointerDown={(e) => onPointerDown(e, speedTool ? "stretch" : "move")}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <Waveform
        bufferId={clip.bufferId}
        color={track.color}
        offset={offset}
        duration={duration * rate}
        bufferDuration={buf?.duration ?? sourceLength(clip)}
        fadeIn={clip.fadeIn}
        fadeOut={clip.fadeOut}
        className="absolute inset-0 size-full"
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 truncate px-1.5 pt-0.5 text-[10px] font-medium text-foreground/90">
        {clip.sourceKind === "video" ? "Видео · " : ""}
        {clip.name}
      </div>
      {(selected || stretching || Math.abs(rate - 1) > 0.02) && (
        <div className="pointer-events-none absolute bottom-0.5 left-1.5 rounded-sm bg-background/70 px-1 font-mono text-[10px] tabular text-play">
          ×{rate.toFixed(2)}
        </div>
      )}
      {tool !== "razor" && (
        <>
          <div
            className="absolute inset-y-0 left-0 z-10 w-handle cursor-ew-resize"
            onPointerDown={(e) => onPointerDown(e, "in")}
          />
          <div
            className="absolute inset-y-0 right-0 z-10 w-handle cursor-ew-resize"
            onPointerDown={(e) => onPointerDown(e, "out")}
          />
        </>
      )}
      {showStretch && tool !== "razor" && (
        <button
          type="button"
          title="Скорость — тяни вправо или влево"
          aria-label="Скорость клипа"
          className={cn(
            "absolute inset-y-0 right-[var(--handle-w)] z-20 flex w-6 items-center justify-center rounded-l-sm bg-foreground/25 text-foreground",
            speedTool && "speed-handle-pulse bg-play/40",
          )}
          onPointerDown={(e) => onPointerDown(e, "stretch")}
        >
          <span className="flex items-center gap-px" aria-hidden="true">
            <span className="text-[9px] font-semibold leading-none">‹</span>
            <span className="h-3 w-px bg-current" />
            <span className="text-[9px] font-semibold leading-none">›</span>
          </span>
        </button>
      )}
    </div>
  );
});

function colorBar(color: string) {
  return (
    {
      "lane-coral": "bg-lane-coral",
      "lane-teal": "bg-lane-teal",
      "lane-blue": "bg-lane-blue",
      "lane-sage": "bg-lane-sage",
      "lane-bronze": "bg-lane-bronze",
      "lane-slate": "bg-lane-slate",
    }[color] ?? "bg-lane-coral"
  );
}

function fillClip(color: string) {
  return (
    {
      "lane-coral": "bg-lane-coral/25",
      "lane-teal": "bg-lane-teal/25",
      "lane-blue": "bg-lane-blue/25",
      "lane-sage": "bg-lane-sage/25",
      "lane-bronze": "bg-lane-bronze/25",
      "lane-slate": "bg-lane-slate/25",
    }[color] ?? "bg-lane-coral/25"
  );
}

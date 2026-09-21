import { toast } from "sonner";
import { uid } from "./utils";
import { engine } from "./audio/engine";
import { extractSlice, getAudioBuffer, persistBuffer, reverseBuffer, setAudioBuffer } from "./audio/buffers";
import { applyFades, denoiseBuffer, enhanceBuffer, pitchShiftBuffer, scaleGain } from "./audio/dsp";
import { detectBpm } from "./audio/bpm";
import { detectKey, formatKey, transposeRoot } from "./audio/key";
import { splitStems, SplitCancelled, type SplitMode } from "./audio/splitter";
import { extractAudioFromFile, isMediaFile, isVideoFile } from "./audio/media";
import { downloadBlob, encodeWav } from "./audio/wav";
import { downloadMp3 } from "./audio/mp3";
import { mixSnapshot, useStudio } from "./studio-store";
import { clipRate, sourceLength } from "./clip-time";
import type { Clip, LaneColor } from "./studio-types";
import { SPARE_LANES } from "./studio-types";

function ctx() {
  return engine.ensure();
}

let opSeq = 0;
let opCancelled = false;
let watchdog: number | null = null;

export function cancelCurrentOp() {
  opCancelled = true;
  useStudio.getState().setBusy(null);
}

function beginOp(label: string, cancelable = true) {
  opSeq += 1;
  const seq = opSeq;
  opCancelled = false;
  if (watchdog != null) window.clearTimeout(watchdog);
  useStudio.getState().setBusy({ label, progress: 0.02, cancelable });
  watchdog = window.setTimeout(() => {
    if (useStudio.getState().busy && opSeq === seq) {
      opCancelled = true;
      useStudio.getState().setBusy(null);
      toast.error("Операция заняла слишком много времени и была остановлена");
    }
  }, 45000);
  return {
    seq,
    cancelled: () => opCancelled || opSeq !== seq,
    progress: (p: number, nextLabel?: string) => {
      if (opSeq !== seq) return;
      useStudio.getState().setBusy({ label: nextLabel ?? label, progress: p, cancelable });
    },
    end: () => {
      if (watchdog != null) {
        window.clearTimeout(watchdog);
        watchdog = null;
      }
      if (opSeq === seq) useStudio.getState().setBusy(null);
    },
  };
}

function clipBufferSlice() {
  const s = useStudio.getState();
  const clip = s.clips.find((c) => c.id === s.selectedClipId);
  if (!clip) {
    toast.error("Выберите клип на дорожке");
    return null;
  }
  const buf = getAudioBuffer(clip.bufferId);
  if (!buf) {
    toast.error("Аудио ещё не загружено");
    return null;
  }
  const audio = extractSlice(buf, ctx(), clip.offset, sourceLength(clip));
  return { clip, audio };
}

async function replaceClipAudio(clipId: string, next: AudioBuffer, extra?: Partial<Clip>) {
  const prev = useStudio.getState().clips.find((c) => c.id === clipId);
  const bufferId = uid("buf");
  setAudioBuffer(bufferId, next);
  await persistBuffer(bufferId, next);
  useStudio.getState().updateClip(clipId, {
    bufferId,
    offset: 0,
    duration: extra?.duration ?? prev?.duration ?? next.duration,
    reverse: false,
    pitch: 0,
    ...extra,
  });
}

type ImportJob = {
  file: File;
  opts?: { trackId?: string; start?: number };
  resolve: (id: string | null) => void;
};

const importQueue: ImportJob[] = [];
let draining = false;

export function importMediaFile(file: File, opts?: { trackId?: string; start?: number }) {
  return new Promise<string | null>((resolve) => {
    importQueue.push({ file, opts, resolve });
    void drainImports();
  });
}

async function drainImports() {
  if (draining) return;
  draining = true;
  try {
    while (importQueue.length) {
      const job = importQueue.shift()!;
      const busy = useStudio.getState().busy;
      if (busy && !busy.label.startsWith("Читаем") && !busy.label.startsWith("Извлекаем") && !busy.label.startsWith("Добавляем")) {
        toast.error("Дождись окончания текущей операции");
        job.resolve(null);
        continue;
      }
      try {
        job.resolve(await importMediaFileNow(job.file, job.opts));
      } catch {
        job.resolve(null);
      }
    }
  } finally {
    draining = false;
    if (importQueue.length) void drainImports();
  }
}

async function importMediaFileNow(file: File, opts?: { trackId?: string; start?: number }) {
  if (!isMediaFile(file) && !file.type) {
    toast.error("Нужен аудио- или видеофайл");
    return null;
  }
  const video = isVideoFile(file);
  const op = beginOp(video ? "Извлекаем звук из видео" : "Читаем аудио");
  try {
    await engine.resume().catch(() => undefined);
    const result = await extractAudioFromFile(file, ctx(), (p, label) =>
      op.progress(p, label ?? (video ? "Извлекаем звук из видео" : "Читаем аудио")),
    );
    if (op.cancelled()) return null;
    const first = useStudio.getState().clips.length === 0;
    let detected: number | undefined;
    let key: ReturnType<typeof detectKey> | null = null;
    try {
      detected = Math.round(detectBpm(result.buffer).bpm);
      key = detectKey(result.buffer);
    } catch {
      detected = undefined;
    }
    if (first) op.progress(0.94, "Добавляем на дорожку");
    else op.progress(0.9, "Добавляем на дорожку");
    const clipId = await useStudio
      .getState()
      .importBuffer(
        result.buffer,
        result.name,
        opts?.trackId,
        opts?.start,
        video ? "video" : "audio",
        detected,
        key ? { root: key.root, mode: key.mode } : null,
      );
    toast.success(video ? "Звук снят с видео и поставлен на дорожку" : "Аудио добавлено на дорожку", {
      action: {
        label: "MP3",
        onClick: () => {
          void downloadMp3(result.buffer, result.name).then(() => toast.success("MP3 сохранён"));
        },
      },
    });
    return clipId;
  } catch (err) {
    toast.error(err instanceof Error ? err.message : "Не удалось прочитать файл");
    return null;
  } finally {
    op.end();
  }
}

export function actionSplitAtPlayhead() {
  const time = engine.getPlayhead();
  const ok = useStudio.getState().splitAtPlayhead(time);
  if (!ok) {
    toast.error("Поставь ползунок на клип и нажми ножницы");
    return false;
  }
  toast.success("Разрезано");
  return true;
}

export function actionSetMark(which: "a" | "b") {
  const t = engine.getPlayhead();
  if (which === "a") useStudio.getState().setMarkA(t);
  else useStudio.getState().setMarkB(t);
  toast.message(which === "a" ? `Метка A · ${t.toFixed(2)} с` : `Метка B · ${t.toFixed(2)} с`);
}

export function actionCutMarked() {
  const s = useStudio.getState();
  const a = s.markA;
  const b = s.markB;
  if (a == null || b == null) {
    toast.error("Поставь две метки: A и B по краям куска");
    return;
  }
  if (!s.selectedClipId && !s.selectedTrackId) {
    toast.error("Выбери клип или дорожку");
    return;
  }
  const ok = s.cutRegion(a, b);
  if (!ok) {
    toast.error("Метки не попали в клип");
    return;
  }
  engine.seek(Math.min(a, b));
  toast.success("Кусок вырезан");
}

export function actionLiftMarked() {
  const s = useStudio.getState();
  const a = s.markA;
  const b = s.markB;
  if (a == null || b == null) {
    toast.error("Поставь две метки: A и B");
    return;
  }
  const ok = s.liftRegion(a, b);
  if (!ok) {
    toast.error("Нечего поднимать");
    return;
  }
  toast.success("Кусок вынесен на новую дорожку");
}

export function actionDeleteSelected() {
  const s = useStudio.getState();
  if (!s.selectedClipId) {
    toast.error("Выбери кусок, который нужно убрать");
    return;
  }
  s.removeClip(s.selectedClipId);
  toast.success("Кусок убран");
}

export async function actionReverse() {
  const pack = clipBufferSlice();
  if (!pack) return;
  if (useStudio.getState().busy) {
    toast.error("Дождись окончания текущей операции");
    return;
  }
  useStudio.getState().snapshot();
  const op = beginOp("Реверс", false);
  try {
    const next = reverseBuffer(pack.audio, ctx());
    await replaceClipAudio(pack.clip.id, next);
    toast.success("Клип развёрнут");
  } finally {
    op.end();
  }
}

export async function actionPitch(semitones: number) {
  const pack = clipBufferSlice();
  if (!pack) return;
  if (Math.abs(semitones) < 0.05) return;
  if (useStudio.getState().busy) {
    toast.error("Дождись окончания текущей операции");
    return;
  }
  useStudio.getState().snapshot();
  const op = beginOp("Смена тональности");
  try {
    const next = await pitchShiftBuffer(pack.audio, ctx(), semitones, (p) => op.progress(p, "Смена тональности"));
    if (op.cancelled()) return;
    await replaceClipAudio(pack.clip.id, next, { pitch: 0 });
    const store = useStudio.getState();
    if (store.keyRoot != null && store.clips.length <= 2) {
      store.setKey(transposeRoot(store.keyRoot, semitones), store.keyMode);
    }
    toast.success(semitones > 0 ? `+${semitones} полутонов` : `${semitones} полутонов`);
  } finally {
    op.end();
  }
}

export async function actionDenoise() {
  const pack = clipBufferSlice();
  if (!pack) return;
  if (useStudio.getState().busy) return;
  useStudio.getState().snapshot();
  const op = beginOp("Убираем шум");
  try {
    const next = await denoiseBuffer(pack.audio, ctx(), 0.72, (p) => op.progress(p, "Убираем шум"));
    if (op.cancelled()) return;
    await replaceClipAudio(pack.clip.id, next);
    toast.success("Посторонний шум приглушён");
  } finally {
    op.end();
  }
}

export async function actionEnhance() {
  const pack = clipBufferSlice();
  if (!pack) return;
  if (useStudio.getState().busy) return;
  useStudio.getState().snapshot();
  const op = beginOp("Улучшение качества");
  try {
    const next = await enhanceBuffer(pack.audio, ctx(), (p) => op.progress(p, "Улучшение качества"));
    if (op.cancelled()) return;
    await replaceClipAudio(pack.clip.id, next);
    toast.success("Звук стал чище и ярче");
  } finally {
    op.end();
  }
}

export function actionDetectBpm() {
  const pack = clipBufferSlice();
  const apply = (clipId: string | null, audio: AudioBuffer) => {
    const result = detectBpm(audio);
    const value = Math.round(result.bpm);
    const key = detectKey(audio);
    const store = useStudio.getState();
    store.snapshot();
    if (clipId) {
      store.updateClip(clipId, { nativeBpm: value });
    } else if (store.selectedClipId) {
      store.updateClip(store.selectedClipId, { nativeBpm: value });
    }
    if (store.clips.length <= 1) {
      store.setBpm(value, { snapshot: false });
      store.setNativeBpm(value);
    }
    store.setKey(key.root, key.mode);
    return { bpm: result, key };
  };
  if (!pack) {
    const s = useStudio.getState();
    const clip = s.clips[0];
    if (!clip) {
      toast.error("Нужен клип, чтобы посчитать BPM и тональность");
      return;
    }
    const buf = getAudioBuffer(clip.bufferId);
    if (!buf) return;
    const result = apply(clip.id, buf);
    toast.success(`BPM ${Math.round(result.bpm.bpm)} · ${result.key.name}`);
    return result;
  }
  const result = apply(pack.clip.id, pack.audio);
  toast.success(`BPM ${Math.round(result.bpm.bpm)} · ${result.key.name}`);
  return result;
}

export function actionSetClipBpm(bpm: number) {
  const s = useStudio.getState();
  if (s.selectedClipId) {
    const clip = s.clips.find((c) => c.id === s.selectedClipId);
    if (clip && (clip.nativeBpm == null || clip.nativeBpm <= 0)) {
      const buf = getAudioBuffer(clip.bufferId);
      if (buf) {
        try {
          const detected = Math.round(detectBpm(extractSlice(buf, ctx(), clip.offset, sourceLength(clip))).bpm);
          s.updateClip(clip.id, { nativeBpm: detected });
        } catch {
          s.updateClip(clip.id, { nativeBpm: s.bpm });
        }
      } else {
        s.updateClip(clip.id, { nativeBpm: s.bpm });
      }
    }
    s.setClipTempo(s.selectedClipId, bpm);
    toast.success(`Клип: ${Math.round(bpm)} BPM`);
    return;
  }
  if (s.selectedTrackId) {
    const clips = s.clips.filter((c) => c.trackId === s.selectedTrackId);
    if (!clips.length) {
      s.setBpm(bpm);
      toast.success(`Сетка: ${Math.round(bpm)} BPM`);
      return;
    }
    for (const clip of clips) {
      if (clip.nativeBpm == null || clip.nativeBpm <= 0) {
        s.updateClip(clip.id, { nativeBpm: s.bpm });
      }
    }
    s.setTrackTempo(s.selectedTrackId, bpm);
    toast.success(`Дорожка: ${Math.round(bpm)} BPM`);
    return;
  }
  s.setBpm(bpm);
  toast.success(`Сетка: ${Math.round(bpm)} BPM`);
}

export function actionDetectKey() {
  const pack = clipBufferSlice();
  const audio = pack?.audio ?? (() => {
    const s = useStudio.getState();
    const clip = s.clips[0];
    return clip ? getAudioBuffer(clip.bufferId) : undefined;
  })();
  if (!audio) {
    toast.error("Нужен клип, чтобы определить тональность");
    return;
  }
  const key = detectKey(audio);
  const store = useStudio.getState();
  store.snapshot();
  store.setKey(key.root, key.mode);
  toast.success(`Тональность: ${key.name}`);
  return key;
}

export async function actionSplit(mode: SplitMode) {
  if (useStudio.getState().busy) {
    toast.error("Дождись окончания текущей операции");
    return;
  }
  const pack = clipBufferSlice();
  if (!pack) return;
  const store = useStudio.getState();
  store.snapshot();
  const op = beginOp("Делим на дорожки");
  const ac = new AbortController();
  const cancelWatch = window.setInterval(() => {
    if (op.cancelled()) ac.abort();
  }, 80);
  try {
    const stems = await splitStems(pack.audio, ctx(), mode, (p) => op.progress(p, "Делим на дорожки"), ac.signal);
    if (op.cancelled()) return;
    const colors: LaneColor[] =
      mode === "vocals-instrumental"
        ? ["lane-sage", "lane-slate"]
        : ["lane-sage", "lane-coral", "lane-bronze", "lane-teal"];
    const originalClipId = pack.clip.id;
    const originalTrackId = pack.clip.trackId;
    const origIndex = Math.max(0, useStudio.getState().tracks.findIndex((t) => t.id === originalTrackId));
    const r = clipRate(pack.clip);

    for (let i = 0; i < stems.length; i++) {
      if (op.cancelled()) return;
      const stem = stems[i]!;
      const bufferId = uid("buf");
      setAudioBuffer(bufferId, stem.buffer);
      await persistBuffer(bufferId, stem.buffer);
      if (i === 0) {
        useStudio.getState().updateTrack(originalTrackId, { name: stem.name, color: colors[0]! });
        useStudio.getState().updateClip(originalClipId, {
          bufferId,
          name: stem.name,
          offset: 0,
          duration: pack.clip.duration,
          reverse: false,
          pitch: 0,
          rate: r,
          nativeBpm: pack.clip.nativeBpm,
          preservePitch: pack.clip.preservePitch,
        });
      } else {
        const trackId = useStudio.getState().insertTrack(origIndex + i, stem.name, colors[i % colors.length], {
          snapshot: false,
        });
        useStudio.getState().addClip({
          trackId,
          bufferId,
          name: stem.name,
          start: pack.clip.start,
          offset: 0,
          duration: pack.clip.duration,
          gain: 1,
          reverse: false,
          fadeIn: pack.clip.fadeIn,
          fadeOut: pack.clip.fadeOut,
          pitch: 0,
          muted: false,
          rate: r,
          nativeBpm: pack.clip.nativeBpm,
          preservePitch: pack.clip.preservePitch,
        });
      }
    }
    useStudio.getState().compactOccupied();
    useStudio.getState().ensureSpareTracks(SPARE_LANES);
    useStudio.getState().persist();
    toast.success(
      mode === "vocals-instrumental"
        ? "Готово: акапелла и минус подряд"
        : "Готово: вокал, ударные, бас и остальное",
    );
  } catch (err) {
    if (err instanceof SplitCancelled || op.cancelled()) {
      toast.message("Разделение остановлено");
      return;
    }
    toast.error(err instanceof Error ? err.message : "Не удалось разделить");
  } finally {
    window.clearInterval(cancelWatch);
    op.end();
  }
}

export type ExportTarget = "mix" | "clip";
export type ExportFormat = "wav" | "mp3";

export async function actionExport(target: ExportTarget = "mix", format: ExportFormat = "wav") {
  const s = useStudio.getState();
  if (s.busy) {
    toast.error("Дождись окончания текущей операции");
    return;
  }
  let buffer: AudioBuffer;
  let filename: string;
  if (target === "clip") {
    const pack = clipBufferSlice();
    if (!pack) return;
    buffer = pack.audio;
    filename = pack.clip.name || "clip";
  } else {
    const duration = Math.max(1, s.clips.reduce((m, c) => Math.max(m, c.start + c.duration), 0) + 0.2);
    const op = beginOp("Сводим микс", false);
    try {
      buffer = await engine.bounce(mixSnapshot(), duration);
    } catch (err) {
      op.end();
      toast.error(err instanceof Error ? err.message : "Не удалось свести");
      return;
    }
    filename = s.name || "pulse";
    op.end();
  }
  const op = beginOp(format === "mp3" ? "Пишем MP3" : "Пишем WAV", false);
  try {
    if (format === "mp3") {
      await downloadMp3(buffer, filename, (p) => op.progress(0.55 + p * 0.4, "Пишем MP3"));
      toast.success("MP3 сохранён");
    } else {
      downloadBlob(encodeWav(buffer), `${filename}.wav`);
      toast.success("WAV сохранён");
    }
  } catch (err) {
    toast.error(err instanceof Error ? err.message : "Не удалось сохранить");
  } finally {
    op.end();
  }
}

export async function actionApplyFades() {
  const pack = clipBufferSlice();
  if (!pack) return;
  useStudio.getState().snapshot();
  const next = applyFades(pack.audio, ctx(), pack.clip.fadeIn, pack.clip.fadeOut);
  await replaceClipAudio(pack.clip.id, next, { fadeIn: 0, fadeOut: 0 });
  toast.success("Затухание записано в клип");
}

export async function actionNormalize() {
  const pack = clipBufferSlice();
  if (!pack) return;
  let peak = 1e-6;
  for (let c = 0; c < pack.audio.numberOfChannels; c++) {
    const d = pack.audio.getChannelData(c);
    for (let i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i]!));
  }
  const g = 0.95 / peak;
  useStudio.getState().snapshot();
  const next = scaleGain(pack.audio, ctx(), g);
  await replaceClipAudio(pack.clip.id, next, { gain: 1 });
  toast.success("Громкость выровнена");
}

export function clipUnderPlayhead(): Clip | undefined {
  const s = useStudio.getState();
  const t = engine.getPlayhead();
  return s.clips.find((c) => t >= c.start && t <= c.start + c.duration);
}

export { formatKey };

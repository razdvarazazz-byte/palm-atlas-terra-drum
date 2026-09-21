import { yieldToMain } from "@/lib/utils";

export type MediaKind = "audio" | "video";

export type ExtractResult = {
  buffer: AudioBuffer;
  name: string;
  kind: MediaKind;
  duration: number;
};

const VIDEO_EXT = /\.(mp4|m4v|mov|webm|mkv|avi|3gp|ogv|mpeg|mpg|wmv|flv|mts|m2ts)$/i;
const AUDIO_EXT = /\.(mp3|wav|wave|ogg|oga|m4a|aac|flac|aiff|aif|wma|opus|weba|caf|aifc)$/i;

export function isVideoFile(file: File): boolean {
  if (file.type.startsWith("video/")) return true;
  return VIDEO_EXT.test(file.name);
}

export function isAudioFile(file: File): boolean {
  if (file.type.startsWith("audio/")) return true;
  return AUDIO_EXT.test(file.name);
}

export function isMediaFile(file: File): boolean {
  return isVideoFile(file) || isAudioFile(file);
}

export function mediaFileName(file: File): string {
  return file.name.replace(/\.[^.]+$/, "") || (isVideoFile(file) ? "Видео" : "Аудио");
}

export type ProgressFn = (p: number, label?: string) => void;

/**
 * Pull a real AudioBuffer out of an audio or video file.
 * 1) decodeAudioData — instant for mp3/wav/ogg/m4a and most phone mp4/webm
 * 2) HTMLMediaElement + MediaRecorder — fallback when the container is exotic
 */
export async function extractAudioFromFile(
  file: File,
  ctx: AudioContext,
  onProgress?: ProgressFn,
): Promise<ExtractResult> {
  const kind: MediaKind = isVideoFile(file) ? "video" : "audio";
  const name = mediaFileName(file);
  const label = kind === "video" ? "Извлекаем звук из видео" : "Читаем аудио";
  onProgress?.(0.04, label);

  if (ctx.state === "suspended") await ctx.resume();

  try {
    const bytes = await file.arrayBuffer();
    onProgress?.(0.22, label);
    const buffer = await decodeArrayBuffer(ctx, bytes);
    assertHasAudio(buffer);
    onProgress?.(1, "Готово");
    return { buffer, name, kind, duration: buffer.duration };
  } catch {
    /* try the player path */
  }

  onProgress?.(0.08, kind === "video" ? "Берём звук с видеодорожки" : "Декодируем через плеер");
  const buffer = await extractViaElement(file, ctx, kind, onProgress);
  assertHasAudio(buffer);
  onProgress?.(1, "Готово");
  return { buffer, name, kind, duration: buffer.duration };
}

export async function decodeArrayBuffer(ctx: AudioContext, bytes: ArrayBuffer): Promise<AudioBuffer> {
  const copy = bytes.slice(0);
  try {
    return await ctx.decodeAudioData(copy);
  } catch {
    return new Promise((resolve, reject) => {
      const again = bytes.slice(0);
      const maybe = ctx.decodeAudioData(again, resolve, reject) as Promise<AudioBuffer> | void;
      if (maybe && typeof maybe.then === "function") maybe.then(resolve, reject);
    });
  }
}

function pickRecorderMime(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
  return types.find((t) => MediaRecorder.isTypeSupported(t));
}

async function extractViaElement(
  file: File,
  ctx: AudioContext,
  kind: MediaKind,
  onProgress?: ProgressFn,
): Promise<AudioBuffer> {
  const url = URL.createObjectURL(file);
  const el = document.createElement(kind === "video" ? "video" : "audio") as HTMLVideoElement;
  el.preload = "auto";
  el.playsInline = true;
  el.muted = false;
  el.crossOrigin = "anonymous";
  el.controls = false;
  el.setAttribute("playsinline", "true");
  el.setAttribute("webkit-playsinline", "true");
  el.src = url;
  el.style.position = "fixed";
  el.style.left = "-9999px";
  el.style.width = "1px";
  el.style.height = "1px";
  el.style.opacity = "0";
  el.style.pointerEvents = "none";
  document.body.appendChild(el);

  const cleanup = () => {
    try {
      el.pause();
    } catch {
      /* noop */
    }
    el.removeAttribute("src");
    el.load();
    el.remove();
    URL.revokeObjectURL(url);
  };

  try {
    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => reject(new Error("Файл слишком долго открывается")), 45000);
      el.onloadedmetadata = () => {
        window.clearTimeout(timer);
        resolve();
      };
      el.onerror = () => {
        window.clearTimeout(timer);
        reject(new Error(kind === "video" ? "Не удалось открыть видео" : "Не удалось открыть аудио"));
      };
    });

    const duration = el.duration;
    if (!Number.isFinite(duration) || duration <= 0) {
      throw new Error("У файла нет длительности");
    }

    if (ctx.state === "suspended") await ctx.resume();

    const dest = ctx.createMediaStreamDestination();
    const srcNode = ctx.createMediaElementSource(el);
    srcNode.connect(dest);
    const silent = ctx.createGain();
    silent.gain.value = 0;
    srcNode.connect(silent);
    silent.connect(ctx.destination);

    const mime = pickRecorderMime();
    if (typeof MediaRecorder === "undefined") {
      throw new Error("Этот браузер не умеет снимать звук с видео");
    }
    const rec = new MediaRecorder(dest.stream, mime ? { mimeType: mime, audioBitsPerSecond: 192000 } : undefined);
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };

    const stopped = new Promise<void>((resolve) => {
      rec.addEventListener("stop", () => resolve(), { once: true });
    });

    rec.start(250);
    el.currentTime = 0;
    await el.play();

    await new Promise<void>((resolve, reject) => {
      const limit = Math.min(180000, Math.max(12000, duration * 1000 + 12000));
      const timer = window.setTimeout(() => reject(new Error("Извлечение звука зависло — попробуй другой файл")), limit);
      el.ontimeupdate = () => {
        if (duration > 0) {
          const p = 0.1 + 0.75 * Math.min(1, el.currentTime / duration);
          onProgress?.(p, kind === "video" ? "Снимаем звук с видео" : "Пишем звук");
        }
      };
      el.onended = () => {
        window.clearTimeout(timer);
        resolve();
      };
      el.onerror = () => {
        window.clearTimeout(timer);
        reject(new Error("Ошибка воспроизведения"));
      };
    });

    if (rec.state !== "inactive") rec.stop();
    await stopped;
    await yieldToMain();

    try {
      srcNode.disconnect();
      silent.disconnect();
    } catch {
      /* noop */
    }

    if (!chunks.length) {
      throw new Error(kind === "video" ? "В видео нет звуковой дорожки" : "Пустой звук");
    }
    const blob = new Blob(chunks, { type: rec.mimeType || mime || "audio/webm" });
    onProgress?.(0.9, "Декодируем звук");
    const ab = await blob.arrayBuffer();
    return await decodeArrayBuffer(ctx, ab);
  } finally {
    cleanup();
  }
}

export function assertHasAudio(buffer: AudioBuffer): void {
  let peak = 0;
  const data = buffer.getChannelData(0);
  const step = Math.max(1, Math.floor(data.length / 8000));
  for (let i = 0; i < data.length; i += step) peak = Math.max(peak, Math.abs(data[i]!));
  if (peak < 1e-4) throw new Error("В файле нет слышимого звука");
}

export function rmsLevel(buffer: AudioBuffer): number {
  const data = buffer.getChannelData(0);
  let sum = 0;
  const step = Math.max(1, Math.floor(data.length / 20000));
  let n = 0;
  for (let i = 0; i < data.length; i += step) {
    const v = data[i]!;
    sum += v * v;
    n++;
  }
  return n ? Math.sqrt(sum / n) : 0;
}

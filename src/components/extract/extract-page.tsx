import { useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Download, Film, Gauge, Music } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PulseLogo } from "@/components/brand/logo";
import { engine } from "@/lib/audio/engine";
import { extractAudioFromFile, isVideoFile, mediaFileName } from "@/lib/audio/media";
import { downloadMp3 } from "@/lib/audio/mp3";
import { downloadBlob, encodeWav } from "@/lib/audio/wav";
import { detectBpm } from "@/lib/audio/bpm";
import { detectKey } from "@/lib/audio/key";
import { createMixFromBuffer } from "@/lib/create-mix";
import { formatTime } from "@/lib/utils";

type Ready = {
  buffer: AudioBuffer;
  name: string;
  kind: "audio" | "video";
  bpm: number;
  key: string;
};

export function ExtractPage() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<{ label: string; progress: number } | null>(null);
  const [ready, setReady] = useState<Ready | null>(null);
  const [over, setOver] = useState(false);

  const run = async (file: File) => {
    setBusy({ label: isVideoFile(file) ? "Извлекаем звук из видео" : "Читаем аудио", progress: 0.04 });
    try {
      await engine.resume();
      const result = await extractAudioFromFile(file, engine.ensure(), (p, label) =>
        setBusy({ label: label ?? "Извлекаем звук", progress: p }),
      );
      const bpm = detectBpm(result.buffer);
      const key = detectKey(result.buffer);
      setReady({
        buffer: result.buffer,
        name: result.name || mediaFileName(file),
        kind: result.kind,
        bpm: Math.round(bpm.bpm),
        key: key.name,
      });
      toast.success(result.kind === "video" ? "Звук снят с видео" : "Аудио готово");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Не удалось извлечь звук");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="flex h-12 items-center justify-between px-4">
        <Link to="/">
          <PulseLogo className="text-sm" markClassName="size-6" />
        </Link>
        <Link to="/" className="text-sm text-muted-foreground">
          Назад
        </Link>
      </header>
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pb-10 pt-4">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Видео → звук</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Сними звук с ролика и сохрани MP3</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Кинь mp4, mov, webm или любой клип с камеры. Звуковая дорожка извлечётся в браузере — без сервера — и её можно
          сразу скачать или открыть в миксе.
        </p>

        <input
          ref={inputRef}
          type="file"
          accept="video/*,audio/*,.mp4,.mov,.webm,.mkv,.m4v,.3gp,.mp3,.wav,.m4a,.ogg"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void run(file);
          }}
        />

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            const file = e.dataTransfer.files[0];
            if (file) void run(file);
          }}
          className={`mt-6 flex min-h-44 flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-4 py-8 text-center transition-colors duration-150 ${
            over ? "border-primary bg-primary/10" : "border-border bg-card"
          }`}
        >
          <span className="grid size-12 place-items-center rounded-lg bg-surface-2 text-primary">
            <Film className="size-6" />
          </span>
          <span className="text-sm font-medium">Нажми или кинь видео сюда</span>
          <span className="text-xs text-muted-foreground">MP4, MOV, WEBM, MKV · звук снимется сам</span>
        </button>

        {busy ? (
          <div className="mt-6 rounded-xl border border-border bg-card p-4">
            <p className="text-sm font-medium">{busy.label}</p>
            <Progress value={Math.round(busy.progress * 100)} className="mt-3" />
            <p className="mt-2 font-mono text-xs tabular text-muted-foreground">{Math.round(busy.progress * 100)}%</p>
          </div>
        ) : null}

        {ready ? (
          <div className="mt-6 space-y-3 rounded-xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{ready.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {ready.kind === "video" ? "Из видео" : "Аудио"} · {formatTime(ready.buffer.duration)} · {ready.bpm} BPM · {ready.key}
                </p>
              </div>
              <Gauge className="size-4 text-muted-foreground" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                className="h-11"
                onClick={() =>
                  void downloadMp3(ready.buffer, ready.name).then(() => toast.success("MP3 сохранён в загрузки"))
                }
              >
                <Download /> MP3
              </Button>
              <Button
                className="h-11"
                variant="secondary"
                onClick={() => {
                  downloadBlob(encodeWav(ready.buffer), `${ready.name}.wav`);
                  toast.success("WAV сохранён");
                }}
              >
                <Download /> WAV
              </Button>
            </div>
            <Button
              className="h-11 w-full"
              variant="outline"
              onClick={async () => {
                const id = await createMixFromBuffer(ready.buffer, ready.name, ready.kind);
                navigate({ to: "/mix/$projectId", params: { projectId: id } });
              }}
            >
              <Music /> Открыть в миксе
            </Button>
          </div>
        ) : null}
      </main>
    </div>
  );
}

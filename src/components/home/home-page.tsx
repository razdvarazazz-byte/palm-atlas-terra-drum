import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Film, Gauge, Scissors, Sparkles, SplitSquareVertical, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PulseLogo } from "@/components/brand/logo";
import { UiModeSwitch } from "@/components/studio/ui-mode-switch";
import { createEmptyProject, deleteProject, listProjectsAsync, saveProject } from "@/lib/projects";
import { buildDemoMix } from "@/lib/audio/demo";
import { engine } from "@/lib/audio/engine";
import { uid } from "@/lib/utils";
import type { ProjectMeta } from "@/lib/studio-types";

export function HomePage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectMeta[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void listProjectsAsync().then(setProjects);
  }, []);

  const openNew = () => {
    const p = createEmptyProject();
    saveProject(p, 0);
    navigate({ to: "/mix/$projectId", params: { projectId: p.id } });
  };

  const openDemo = async (mode: "multi" | "mix") => {
    setBusy(true);
    try {
      await engine.resume();
      const demo = await buildDemoMix();
      const p = createEmptyProject(mode === "multi" ? "Демо: 4 дорожки" : "Демо: сведённый трек");
      if (mode === "multi") {
        p.tracks = demo.tracks.map((t) => ({ ...t, volume: t.volume || 1 }));
        p.clips = demo.clips;
        p.bpm = demo.bpm;
        p.nativeBpm = demo.bpm;
      } else {
        const trackId = uid("trk");
        p.tracks = [
          {
            id: trackId,
            name: "Микс",
            color: "lane-coral",
            volume: 1,
            pan: 0,
            mute: false,
            solo: false,
            armed: false,
          },
        ];
        p.bpm = demo.bpm;
        p.nativeBpm = demo.bpm;
        p.clips = [
          {
            id: uid("clip"),
            trackId,
            bufferId: demo.mixed.bufferId,
            name: demo.mixed.name,
            start: 0,
            offset: 0,
            duration: demo.mixed.duration,
            gain: 1,
            reverse: false,
            fadeIn: 0.01,
            fadeOut: 0.08,
            pitch: 0,
            muted: false,
            rate: 1,
            nativeBpm: demo.bpm,
            preservePitch: false,
          },
        ];
      }
      saveProject(p, demo.mixed.duration);
      navigate({ to: "/mix/$projectId", params: { projectId: p.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Не удалось собрать демо");
    } finally {
      setBusy(false);
    }
  };

  const features = useMemo(
    () => [
      { icon: Film, title: "Звук из видео", text: "Кинь mp4 или клип с камеры — звук снимется сам и ляжет на дорожку." },
      { icon: Scissors, title: "Ножницы", text: "Режь по ползунку. Кнопки < и > откатывают каждый шаг: метка, разрез, удаление." },
      { icon: SplitSquareVertical, title: "Стемы", text: "Акапелла, минус, бас, ударные — дорожки встают подряд, без пустых дыр." },
      { icon: Gauge, title: "BPM клипа", text: "Темп каждой фразы свой: 112, 140, любое. Сетка проекта отдельно." },
      { icon: Volume2, title: "Микшер", text: "Громкость дорожки до 200% — слышно сразу, прямо с телефона." },
      { icon: Sparkles, title: "MP3 и WAV", text: "Проекты остаются на устройстве. Экспорт микса и клипа." },
    ],
    [],
  );

  return (
    <div className="min-h-dvh">
      <header className="glass-bar sticky top-0 z-10 flex items-center justify-between px-4 py-3 sm:px-8">
        <PulseLogo />
        <Button onClick={openNew} className="h-10">
          Новый микс
        </Button>
      </header>

      <section className="mx-auto max-w-6xl px-4 pb-10 pt-4 sm:px-8 sm:pt-8">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Mix studio</p>
        <h1 className="mt-3 max-w-xl text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
          Видео в звук. Вырежи слово. Подставь другое.
        </h1>
        <p className="mt-4 max-w-lg text-base leading-relaxed text-muted-foreground">
          Pulse — студия в браузере: зажми клип и перетащи влево-вправо или на любую дорожку. Первый файл сверху,
          следующие сразу ниже. Свободные дорожки уже ждут снизу.
        </p>
        <div className="mt-6 grid gap-2 sm:flex sm:flex-wrap">
          <Button size="lg" className="h-12 w-full sm:w-auto" onClick={openNew} disabled={busy}>
            Создать микс
          </Button>
          <Button size="lg" variant="secondary" className="h-12 w-full sm:w-auto" asChild>
            <Link to="/extract">
              <Film /> Видео → MP3
            </Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-12 w-full sm:w-auto"
            onClick={() => void openDemo("mix")}
            disabled={busy}
          >
            {busy ? "Собираем…" : "Демо для сплиттера"}
          </Button>
        </div>
        <div className="mt-6 max-w-lg">
          <UiModeSwitch />
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-3 px-4 pb-12 sm:grid-cols-2 sm:px-8 lg:grid-cols-3">
        {features.map((f) => (
          <article key={f.title} className="rounded-xl border border-border/70 bg-card/80 p-5">
            <f.icon className="size-5 text-primary" />
            <h2 className="mt-3 text-sm font-semibold">{f.title}</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{f.text}</p>
          </article>
        ))}
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-8">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-lg font-semibold">Сохранённые проекты</h2>
        </div>
        {projects.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-5 py-10 text-sm text-muted-foreground">
            Пока пусто. Создай микс или сними звук с видео — проекты остаются на этом устройстве.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => navigate({ to: "/mix/$projectId", params: { projectId: p.id } })}
                  className="w-full rounded-xl border border-border/70 bg-card/80 p-4 text-left transition-colors duration-150 hover:bg-surface-2"
                >
                  <Cover seed={p.id} />
                  <div className="mt-3 flex items-start justify-between gap-2">
                    <div>
                      <div className="font-medium">{p.name}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {p.bpm} BPM · {new Date(p.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <span
                      role="button"
                      tabIndex={0}
                      className="text-xs text-muted-foreground hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteProject(p.id);
                        void listProjectsAsync().then(setProjects);
                      }}
                    >
                      Удалить
                    </span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Cover({ seed }: { seed: string }) {
  const n = seed.split("").reduce((a, ch) => a + ch.charCodeAt(0), 0);
  return (
    <svg viewBox="0 0 280 64" className="h-16 w-full rounded-md bg-surface-2 text-primary" aria-hidden="true">
      {Array.from({ length: 56 }, (_, i) => {
        const h = 8 + ((n * (i + 3) * 13) % 40);
        return (
          <rect
            key={i}
            x={4 + i * 5}
            y={(64 - h) / 2}
            width="3.2"
            height={h}
            rx="0.6"
            fill="currentColor"
            opacity={0.35 + ((i + n) % 5) / 12}
          />
        );
      })}
    </svg>
  );
}

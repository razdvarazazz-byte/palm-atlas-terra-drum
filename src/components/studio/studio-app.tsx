import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { engine } from "@/lib/audio/engine";
import { restoreBuffer } from "@/lib/audio/buffers";
import { isMediaFile } from "@/lib/audio/media";
import { createEmptyProject, loadProjectAsync, saveProject } from "@/lib/projects";
import { mixSnapshot, useStudio } from "@/lib/studio-store";
import { importMediaFile } from "@/lib/clip-actions";
import { TopBar, Transport } from "./chrome";
import { Timeline } from "./timeline";
import { BottomPanel, BusyOverlay } from "./panels";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { ProjectData } from "@/lib/studio-types";

async function restoreAudio(data: ProjectData) {
  const audioCtx = engine.ensure();
  const unique = [...new Set(data.clips.map((c) => c.bufferId))];
  await Promise.all(unique.map((id) => restoreBuffer(id, audioCtx).catch(() => null)));
}

export function StudioApp({ projectId }: { projectId: string }) {
  const load = useStudio((s) => s.load);
  const persist = useStudio((s) => s.persist);
  const hydrated = useStudio((s) => s.hydrated);
  const busy = useStudio((s) => s.busy);
  const busyHidden = useStudio((s) => s.busyHidden);
  const loadedFor = useRef<string | null>(null);

  useEffect(() => {
    let alive = true;
    const state = useStudio.getState();
    if (state.hydrated && state.id === projectId) {
      loadedFor.current = projectId;
      void restoreAudio(state);
      return () => {
        alive = false;
      };
    }
    if (loadedFor.current !== projectId) {
      useStudio.setState({ hydrated: false });
    }
    (async () => {
      try {
        const data = await loadProjectAsync(projectId);
        if (!alive) return;
        const now = useStudio.getState();
        if (now.hydrated && now.id === projectId && now.undoStack.length > 0) {
          void restoreAudio(now);
          return;
        }
        if (!data) {
          if (now.id === projectId && now.clips.length > 0) {
            useStudio.setState({ hydrated: true });
            return;
          }
          const fresh = createEmptyProject();
          fresh.id = projectId;
          saveProject(fresh, 0);
          if (alive) load(fresh);
          loadedFor.current = projectId;
          return;
        }
        load(data);
        loadedFor.current = projectId;
        await restoreAudio(data);
        if (alive) useStudio.setState((s) => ({ clips: s.clips.map((c) => ({ ...c })) }));
      } catch {
        if (!alive) return;
        const now = useStudio.getState();
        if (now.id === projectId && now.clips.length > 0) {
          useStudio.setState({ hydrated: true });
          toast.error("Часть аудио могла не подгрузиться");
          return;
        }
        const fresh = createEmptyProject();
        fresh.id = projectId;
        load(fresh);
        toast.error("Проект открыт, часть аудио могла не загрузиться");
      }
    })();
    return () => {
      alive = false;
    };
  }, [projectId, load]);

  useEffect(() => {
    return () => {
      engine.stop();
    };
  }, [projectId]);

  useEffect(() => {
    const t = window.setInterval(() => {
      const s = useStudio.getState();
      if (!s.busy && !s.dragging && s.hydrated) persist();
    }, 10000);
    return () => window.clearInterval(t);
  }, [persist]);

  useEffect(() => {
    const kill = (e: Event) => e.preventDefault();
    document.addEventListener("gesturestart", kill, { passive: false } as AddEventListenerOptions);
    document.addEventListener("gesturechange", kill, { passive: false } as AddEventListenerOptions);
    document.addEventListener("gestureend", kill, { passive: false } as AddEventListenerOptions);
    return () => {
      document.removeEventListener("gesturestart", kill);
      document.removeEventListener("gesturechange", kill);
      document.removeEventListener("gestureend", kill);
    };
  }, []);

  useEffect(() => {
    const resume = () => void engine.resume().catch(() => undefined);
    const onKey = (e: KeyboardEvent) => {
      resume();
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.code === "Space") {
        e.preventDefault();
        void (async () => {
          await engine.resume();
          if (engine.playing) engine.pause();
          else await engine.play(mixSnapshot());
        })();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) useStudio.getState().redo();
        else useStudio.getState().undo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        useStudio.getState().redo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        useStudio.getState().persist();
        toast.success("Сохранено");
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        const id = useStudio.getState().selectedClipId;
        if (id) useStudio.getState().removeClip(id);
      }
      if (e.key.toLowerCase() === "s" && !e.metaKey && !e.ctrlKey) {
        const s = useStudio.getState();
        s.splitAtPlayhead(engine.getPlayhead());
      }
      if (e.key.toLowerCase() === "a" && !e.metaKey && !e.ctrlKey) {
        useStudio.getState().setMarkA(engine.getPlayhead());
      }
      if (e.key.toLowerCase() === "b" && !e.metaKey && !e.ctrlKey) {
        useStudio.getState().setMarkB(engine.getPlayhead());
      }
    };
    window.addEventListener("pointerdown", resume);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", resume);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <TooltipProvider delayDuration={250}>
      <div
        className="flex h-dvh min-h-0 flex-col overflow-hidden bg-background"
        onDragOver={(e) => e.preventDefault()}
        onDrop={async (e) => {
          e.preventDefault();
          if ((e.target as HTMLElement | null)?.closest?.("[data-track-lane]")) return;
          if (useStudio.getState().busy) {
            toast.error("Дождись окончания текущей операции");
            return;
          }
          const files = [...e.dataTransfer.files].filter(isMediaFile);
          if (!files.length) {
            toast.error("Нужен аудио- или видеофайл");
            return;
          }
          for (const file of files) await importMediaFile(file);
        }}
      >
        <TopBar />
        {hydrated ? (
          <Timeline />
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">Открываем проект…</div>
        )}
        <div className="glass-bar shrink-0 border-t border-border/60">
          <Transport />
          <BottomPanel />
        </div>
        {busy && !busyHidden ? <BusyOverlay /> : null}
      </div>
    </TooltipProvider>
  );
}

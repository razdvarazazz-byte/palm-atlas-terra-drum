import { Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { actionExport } from "@/lib/clip-actions";
import { useStudio } from "@/lib/studio-store";

export function ExportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const hasClip = useStudio((s) => Boolean(s.selectedClipId));
  const hasClips = useStudio((s) => s.clips.length > 0);
  const run = (target: "mix" | "clip", format: "wav" | "mp3") => {
    onOpenChange(false);
    void actionExport(target, format);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Сохранить звук</DialogTitle>
          <DialogDescription>Микс целиком или выбранный кусок. MP3 — для телефона, WAV — без потерь.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Весь микс</p>
          <div className="grid grid-cols-2 gap-2">
            <Button disabled={!hasClips} onClick={() => run("mix", "mp3")}>
              <Download /> MP3
            </Button>
            <Button variant="secondary" disabled={!hasClips} onClick={() => run("mix", "wav")}>
              <Download /> WAV
            </Button>
          </div>
          <p className="mt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Выбранный клип</p>
          <div className="grid grid-cols-2 gap-2">
            <Button disabled={!hasClip} onClick={() => run("clip", "mp3")}>
              <Download /> MP3
            </Button>
            <Button variant="secondary" disabled={!hasClip} onClick={() => run("clip", "wav")}>
              <Download /> WAV
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

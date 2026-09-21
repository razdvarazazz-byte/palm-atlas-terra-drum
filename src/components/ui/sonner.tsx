import { useEffect, useState, type ComponentProps } from "react";
import { toast, Toaster as Sonner } from "sonner";
import { Button } from "@/components/ui/button";

function Toaster({ ...props }: ComponentProps<typeof Sonner>) {
  return (
    <>
      <Sonner
        theme="dark"
        className="toaster group"
        position="top-center"
        duration={1800}
        closeButton
        visibleToasts={3}
        offset={12}
        toastOptions={{
          duration: 1800,
          classNames: {
            toast:
              "group toast cursor-pointer group-[.toaster]:bg-popover group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-panel",
            description: "group-[.toast]:text-muted-foreground",
            actionButton: "group-[.toaster]:bg-primary group-[.toaster]:text-primary-foreground",
            cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
            closeButton: "group-[.toast]:bg-foreground/10 group-[.toast]:text-foreground group-[.toast]:border-border",
          },
        }}
        {...props}
      />
      <ToastSkip />
    </>
  );
}

function ToastSkip() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const sync = () => {
      setOpen(document.querySelectorAll("[data-sonner-toast]").length > 0);
    };
    sync();
    const id = window.setInterval(sync, 250);
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest("button, a")) return;
      if (target?.closest("[data-sonner-toast]")) toast.dismiss();
    };
    document.addEventListener("click", onClick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("click", onClick);
    };
  }, []);
  if (!open) return null;
  return (
    <Button
      type="button"
      size="sm"
      variant="secondary"
      className="fixed right-3 top-3 z-[100] h-8 px-3 text-xs"
      onClick={() => toast.dismiss()}
    >
      Пропустить
    </Button>
  );
}

export { Toaster };

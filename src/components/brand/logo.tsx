import { cn } from "@/lib/utils";

export function PulseLogo({ className, markClassName }: { className?: string; markClassName?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-semibold tracking-tight", className)}>
      <svg viewBox="0 0 24 24" className={cn("size-7", markClassName)} aria-hidden="true">
        <rect width="24" height="24" rx="6" className="fill-primary" />
        <rect x="5" y="13" width="2.2" height="6" rx="0.6" className="fill-primary-foreground" />
        <rect x="9" y="7" width="2.2" height="12" rx="0.6" className="fill-primary-foreground" />
        <rect x="13" y="10" width="2.2" height="9" rx="0.6" className="fill-primary-foreground" />
        <rect x="17" y="5" width="2.2" height="14" rx="0.6" className="fill-primary-foreground" />
      </svg>
      <span>Pulse</span>
    </span>
  );
}

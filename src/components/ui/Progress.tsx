import { cn } from "@/lib/cn";

export function Progress({ value, className }: { value: number; className?: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div className="h-full bg-primary transition-[width]" style={{ width: `${v}%` }} />
    </div>
  );
}



import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: Props) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md border text-sm font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:pointer-events-none disabled:opacity-50",
        variant === "primary" &&
          "border-transparent bg-primary text-primary-foreground hover:opacity-90",
        variant === "secondary" &&
          "border-border bg-card text-foreground hover:bg-muted",
        variant === "ghost" && "border-transparent hover:bg-muted",
        variant === "destructive" &&
          "border-transparent bg-destructive text-destructive-foreground hover:opacity-90",
        size === "sm" && "h-8 px-3",
        size === "md" && "h-10 px-4",
        size === "lg" && "h-11 px-5",
        className
      )}
      {...props}
    />
  );
}



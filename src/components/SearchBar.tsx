import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";

export function SearchBar({
  value,
  onChange,
  placeholder = "Search…",
  className
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn("w-full", className)}>
      <label className="sr-only" htmlFor="search">
        Search
      </label>
      <Input
        id="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        inputMode="search"
      />
    </div>
  );
}



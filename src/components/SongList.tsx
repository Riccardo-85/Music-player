import { Artwork } from "@/components/Artwork";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { formatDuration } from "@/lib/audio";
import type { Track } from "@/types";
import type { ReactNode } from "react";

export function SongList({
  tracks,
  selectedIds,
  onToggleSelect,
  onPlay,
  onEnqueue,
  onPlayNext,
  rightSlot
}: {
  tracks: Track[];
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onPlay: (id: string) => void;
  onEnqueue: (id: string) => void;
  onPlayNext: (id: string) => void;
  rightSlot?: (track: Track) => ReactNode;
}) {
  return (
    <div className="card overflow-hidden">
      <div className="grid grid-cols-[36px_1fr_80px] gap-3 border-b bg-muted/40 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:grid-cols-[36px_1fr_110px_220px]">
        <div className="flex items-center justify-center">
          <span className="sr-only">Select</span>
        </div>
        <div>Track</div>
        <div className="text-right">Time</div>
        <div className="hidden text-right sm:block">Actions</div>
      </div>

      <ul className="divide-y">
        {tracks.map((t) => {
          const checked = selectedIds?.has(t.id) ?? false;
          return (
            <li key={t.id} className="px-4 py-3">
              <div className="grid grid-cols-[36px_1fr_80px] items-center gap-3 sm:grid-cols-[36px_1fr_110px_220px]">
                <div className="flex items-center justify-center">
                  {onToggleSelect ? (
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggleSelect(t.id)}
                      aria-label={`Select ${t.title}`}
                      className="h-4 w-4 accent-primary"
                    />
                  ) : null}
                </div>

                <button
                  className={cn(
                    "flex min-w-0 items-center gap-3 rounded-md px-2 py-1 text-left hover:bg-muted"
                  )}
                  onClick={() => onPlay(t.id)}
                >
                  <Artwork track={t} size={42} />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{t.title}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {t.artist} • {t.album}
                    </div>
                  </div>
                </button>

                <div className="text-right text-xs tabular-nums text-muted-foreground">
                  {formatDuration(t.duration)}
                </div>

                <div className="hidden justify-end gap-2 sm:flex">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onEnqueue(t.id)}
                    aria-label={`Add ${t.title} to queue`}
                  >
                    Add to queue
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onPlayNext(t.id)}
                    aria-label={`Play ${t.title} next`}
                  >
                    Play next
                  </Button>
                  {rightSlot ? rightSlot(t) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {tracks.length === 0 ? (
        <div className="p-6 text-sm text-muted-foreground">No songs found.</div>
      ) : null}
    </div>
  );
}



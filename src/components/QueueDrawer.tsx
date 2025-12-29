import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEffect, useMemo, useState } from "react";

import { Artwork } from "@/components/Artwork";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { formatDuration } from "@/lib/audio";
import { getTracksByIds } from "@/hooks/useIndexedDb";
import { usePlayer } from "@/hooks/usePlayer";
import type { Track } from "@/types";

function QueueRow({
  id,
  track,
  active,
  index,
  onRemove,
  onPlay
}: {
  id: string;
  track?: Track;
  active: boolean;
  index: number;
  onRemove: () => void;
  onPlay: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-center gap-3 rounded-md border bg-card p-2",
        active && "border-primary/50",
        isDragging && "opacity-70"
      )}
    >
      <button
        className="cursor-grab rounded-md px-2 py-2 text-muted-foreground hover:bg-muted"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        ≡
      </button>
      <button
        className="flex min-w-0 flex-1 items-center gap-3 rounded-md px-2 py-1 text-left hover:bg-muted"
        onClick={onPlay}
      >
        <Artwork track={track} size={38} />
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">
            {track?.title ?? `Track ${index + 1}`}
          </div>
          <div className="truncate text-xs text-muted-foreground">
            {track ? `${track.artist} • ${track.album}` : "Missing metadata"}
          </div>
        </div>
      </button>
      <div className="w-12 text-right text-xs tabular-nums text-muted-foreground">
        {track ? formatDuration(track.duration) : "--:--"}
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onRemove}
        aria-label="Remove from queue"
      >
        Remove
      </Button>
    </div>
  );
}

export function QueueDrawer() {
  const {
    queue,
    currentIndex,
    isQueueOpen,
    setQueueOpen,
    reorderQueue,
    removeAt,
    clearQueue,
    setQueue
  } = usePlayer();

  const [tracks, setTracks] = useState<Track[]>([]);
  const trackMap = useMemo(() => new Map(tracks.map((t) => [t.id, t])), [tracks]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const list = await getTracksByIds(queue);
      if (cancelled) return;
      setTracks(list);
    })();
    return () => {
      cancelled = true;
    };
  }, [queue]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const ids = queue;

  const onDragEnd = (e: DragEndEvent) => {
    const activeId = String(e.active.id);
    const overId = e.over?.id ? String(e.over.id) : undefined;
    if (!overId || activeId === overId) return;
    const from = ids.indexOf(activeId);
    const to = ids.indexOf(overId);
    if (from < 0 || to < 0) return;
    reorderQueue(from, to);
  };

  return (
    <div
      id="queue-drawer"
      className={cn(
        "fixed inset-0 z-50",
        isQueueOpen ? "pointer-events-auto" : "pointer-events-none"
      )}
      aria-hidden={!isQueueOpen}
    >
      <div
        className={cn(
          "absolute inset-0 bg-black/50 transition-opacity",
          isQueueOpen ? "opacity-100" : "opacity-0"
        )}
        onClick={() => setQueueOpen(false)}
      />

      <div
        className={cn(
          "absolute bottom-0 right-0 top-0 w-full max-w-xl border-l bg-background shadow-soft transition-transform",
          "md:bottom-0 md:top-0",
          isQueueOpen ? "translate-x-0" : "translate-x-full"
        )}
        role="dialog"
        aria-label="Queue"
      >
        <div className="flex items-center justify-between border-b p-4">
          <div>
            <div className="text-sm font-semibold">Queue</div>
            <div className="text-xs text-muted-foreground">
              Drag to reorder. Current track is highlighted.
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                if (queue.length <= 1) return;
                const shuffled = queue.slice();
                for (let i = shuffled.length - 1; i > 0; i--) {
                  const j = Math.floor(Math.random() * (i + 1));
                  const a = shuffled[i];
                  const b = shuffled[j];
                  if (a === undefined || b === undefined) continue;
                  shuffled[i] = b;
                  shuffled[j] = a;
                }
                setQueue(shuffled, { startIndex: 0, autoplay: true });
              }}
              disabled={queue.length < 2}
            >
              Shuffle all
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setQueueOpen(false)}>
              Close
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-b p-4">
          <div className="text-xs text-muted-foreground">{queue.length} tracks</div>
          <Button
            variant="destructive"
            size="sm"
            onClick={clearQueue}
            disabled={queue.length === 0}
          >
            Clear
          </Button>
        </div>

        <div className="p-4">
          {queue.length === 0 ? (
            <div className="card p-4 text-sm text-muted-foreground">
              Your queue is empty. Add songs from the library.
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={onDragEnd}
            >
              <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                <div className="flex flex-col gap-2">
                  {ids.map((id, idx) => (
                    <QueueRow
                      key={id}
                      id={id}
                      index={idx}
                      track={trackMap.get(id)}
                      active={idx === currentIndex}
                      onRemove={() => removeAt(idx)}
                      onPlay={() => setQueue(ids, { startIndex: idx, autoplay: true })}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>
    </div>
  );
}



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
import { Link, useParams } from "react-router-dom";

import { Artwork } from "@/components/Artwork";
import { SearchBar } from "@/components/SearchBar";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { formatDuration } from "@/lib/audio";
import { db } from "@/db/indexedDb";
import { getTracksByIds, useAllTracks, usePlaylistById } from "@/hooks/useIndexedDb";
import { useToast } from "@/components/ToastProvider";
import { usePlayer } from "@/hooks/usePlayer";
import type { Track } from "@/types";

function moveItem<T>(arr: T[], from: number, to: number) {
  const next = arr.slice();
  const [item] = next.splice(from, 1);
  if (item === undefined) return next;
  next.splice(to, 0, item);
  return next;
}

function Row({
  id,
  track,
  onRemove
}: {
  id: string;
  track?: Track;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-center gap-3 rounded-md border bg-card p-2",
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
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Artwork track={track} size={40} />
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{track?.title ?? "Missing track"}</div>
          <div className="truncate text-xs text-muted-foreground">
            {track ? `${track.artist} • ${track.album}` : "This track is not in your library"}
          </div>
        </div>
      </div>
      <div className="w-12 text-right text-xs tabular-nums text-muted-foreground">
        {track ? formatDuration(track.duration) : "--:--"}
      </div>
      <Button variant="ghost" size="sm" onClick={onRemove} aria-label="Remove from playlist">
        Remove
      </Button>
    </div>
  );
}

export function PlaylistDetail() {
  const { id } = useParams();
  const playlist = usePlaylistById(id);
  const allTracks = useAllTracks() ?? [];
  const { toast } = useToast();
  const player = usePlayer();

  const [playlistTracks, setPlaylistTracks] = useState<Track[]>([]);
  const trackMap = useMemo(
    () => new Map(playlistTracks.map((t) => [t.id, t])),
    [playlistTracks]
  );

  const [q, setQ] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ids = playlist?.trackIds ?? [];
      const list = await getTracksByIds(ids);
      if (cancelled) return;
      setPlaylistTracks(list);
    })();
    return () => {
      cancelled = true;
    };
  }, [playlist?.id, playlist?.trackIds?.join("|")]); // eslint-disable-line react-hooks/exhaustive-deps

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const ids = playlist?.trackIds ?? [];

  const onDragEnd = async (e: DragEndEvent) => {
    if (!playlist) return;
    const activeId = String(e.active.id);
    const overId = e.over?.id ? String(e.over.id) : undefined;
    if (!overId || activeId === overId) return;
    const from = ids.indexOf(activeId);
    const to = ids.indexOf(overId);
    if (from < 0 || to < 0) return;
    const nextIds = moveItem(ids, from, to);
    await db.playlists.put({ ...playlist, trackIds: nextIds, updatedAt: Date.now() });
  };

  const filteredCandidates = useMemo(() => {
    const query = q.trim().toLowerCase();
    const inPlaylist = new Set(ids);
    const candidates = allTracks.filter((t) => !inPlaylist.has(t.id));
    if (!query) return candidates;
    return candidates.filter((t) =>
      `${t.title} ${t.artist} ${t.album}`.toLowerCase().includes(query)
    );
  }, [q, allTracks, ids.join("|")]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!playlist) {
    return (
      <div className="card p-6">
        <div className="text-sm text-muted-foreground">Playlist not found.</div>
        <div className="mt-3">
          <Link to="/playlists" className="text-sm font-semibold text-primary hover:underline">
            Back to playlists
          </Link>
        </div>
      </div>
    );
  }

  const totalDuration = playlistTracks.reduce((acc, t) => acc + (t.duration ?? 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-2xl font-semibold">{playlist.name}</div>
          <div className="mt-1 text-sm text-muted-foreground">
            {playlist.trackIds.length} track(s) • {formatDuration(totalDuration)}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="primary"
            onClick={() => {
              if (playlist.trackIds.length === 0) return;
              player.setQueue(playlist.trackIds, { startIndex: 0, autoplay: true });
              toast({ title: "Playing playlist", description: playlist.name });
            }}
            disabled={playlist.trackIds.length === 0}
          >
            Play
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              player.enqueue(playlist.trackIds, { position: "end" });
              toast({ title: "Added playlist to queue", description: playlist.name });
            }}
            disabled={playlist.trackIds.length === 0}
          >
            Add to queue
          </Button>
          <Button variant="secondary" onClick={() => setShowAdd((v) => !v)}>
            {showAdd ? "Close" : "Add tracks"}
          </Button>
        </div>
      </div>

      {showAdd ? (
        <div className="card p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Add tracks</div>
              <div className="text-xs text-muted-foreground">
                Search your library and add tracks to this playlist.
              </div>
            </div>
          </div>
          <div className="mt-3">
            <SearchBar value={q} onChange={setQ} placeholder="Search library…" />
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {filteredCandidates.slice(0, 24).map((t) => (
              <button
                key={t.id}
                className="flex items-center justify-between gap-3 rounded-md border bg-card px-3 py-2 text-left hover:bg-muted"
                onClick={async () => {
                  const nextIds = Array.from(new Set([...playlist.trackIds, t.id]));
                  await db.playlists.put({ ...playlist, trackIds: nextIds, updatedAt: Date.now() });
                  toast({ title: "Added to playlist", description: `${t.title}` });
                }}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Artwork track={t} size={36} />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{t.title}</div>
                    <div className="truncate text-xs text-muted-foreground">{t.artist}</div>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">Add</span>
              </button>
            ))}
          </div>
          {filteredCandidates.length > 24 ? (
            <div className="mt-3 text-xs text-muted-foreground">
              Showing first 24 results.
            </div>
          ) : null}
        </div>
      ) : null}

      {playlist.trackIds.length === 0 ? (
        <div className="card p-6 text-sm text-muted-foreground">
          This playlist is empty. Click “Add tracks” to start building it.
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={(e) => void onDragEnd(e)}
        >
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            <div className="card p-4">
              <div className="space-y-2">
                {ids.map((tid) => (
                  <Row
                    key={tid}
                    id={tid}
                    track={trackMap.get(tid)}
                    onRemove={async () => {
                      const nextIds = playlist.trackIds.filter((x) => x !== tid);
                      await db.playlists.put({ ...playlist, trackIds: nextIds, updatedAt: Date.now() });
                      toast({ title: "Removed from playlist" });
                    }}
                  />
                ))}
              </div>
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}



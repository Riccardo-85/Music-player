import { useMemo, useState } from "react";

import { SearchBar } from "@/components/SearchBar";
import { SongList } from "@/components/SongList";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ToastProvider";
import { db } from "@/db/indexedDb";
import { useAllPlaylists, useAllTracks } from "@/hooks/useIndexedDb";
import { usePlayer } from "@/hooks/usePlayer";
import type { Playlist } from "@/types";
import type { Track } from "@/types";

type SortKey = "createdAt" | "title" | "artist" | "album" | "duration";

function sortTracks(tracks: Track[], key: SortKey) {
  const copy = tracks.slice();
  copy.sort((a, b) => {
    if (key === "createdAt") return b.createdAt - a.createdAt;
    if (key === "duration") return (a.duration ?? 0) - (b.duration ?? 0);
    return String(a[key] ?? "").localeCompare(String(b[key] ?? ""), undefined, {
      sensitivity: "base"
    });
  });
  return copy;
}

export function Songs() {
  const { toast } = useToast();
  const tracks = useAllTracks() ?? [];
  const playlists = useAllPlaylists() ?? [];
  const player = usePlayer();

  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("createdAt");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [playlistId, setPlaylistId] = useState<string>("");
  const [newPlaylistName, setNewPlaylistName] = useState("");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    const base = query
      ? tracks.filter((t) => {
          const hay = `${t.title} ${t.artist} ${t.album}`.toLowerCase();
          return hay.includes(query);
        })
      : tracks;
    return sortTracks(base, sort);
  }, [tracks, q, sort]);

  const selectedIds = useMemo(() => Array.from(selected), [selected]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addSelectedToQueue = () => {
    if (selectedIds.length === 0) return;
    player.enqueue(selectedIds, { position: "end" });
    toast({ title: "Added to queue", description: `${selectedIds.length} track(s)` });
  };

  const playSelected = () => {
    if (selectedIds.length === 0) return;
    player.setQueue(selectedIds, { startIndex: 0, autoplay: true });
    toast({ title: "Playing selection", description: `${selectedIds.length} track(s)` });
  };

  const ensurePlaylist = async (): Promise<Playlist | undefined> => {
    if (playlistId) {
      const p = await db.playlists.get(playlistId);
      return p ?? undefined;
    }
    const name = newPlaylistName.trim();
    if (!name) return undefined;
    const now = Date.now();
    const p: Playlist = {
      id: crypto.randomUUID(),
      name,
      trackIds: [],
      createdAt: now,
      updatedAt: now
    };
    await db.playlists.put(p);
    setPlaylistId(p.id);
    setNewPlaylistName("");
    return p;
  };

  const addSelectedToPlaylist = async () => {
    if (selectedIds.length === 0) return;
    const p = await ensurePlaylist();
    if (!p) {
      toast({ title: "Choose or create a playlist", variant: "error" });
      return;
    }
    const next = Array.from(new Set([...p.trackIds, ...selectedIds]));
    await db.playlists.put({ ...p, trackIds: next, updatedAt: Date.now() });
    toast({ title: "Added to playlist", description: `${p.name} • ${selectedIds.length} track(s)` });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-2xl font-semibold">All Songs</div>
          <div className="mt-1 text-sm text-muted-foreground">
            Search, sort, select, and add to queue or playlists.
          </div>
        </div>
      </div>

      <div className="card p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <SearchBar value={q} onChange={setQ} className="md:max-w-md" />

          <div className="flex flex-wrap items-center gap-2 md:ml-auto">
            <label className="text-sm text-muted-foreground" htmlFor="sort">
              Sort
            </label>
            <select
              id="sort"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              aria-label="Sort"
            >
              <option value="createdAt">Recently added</option>
              <option value="title">Title</option>
              <option value="artist">Artist</option>
              <option value="album">Album</option>
              <option value="duration">Duration</option>
            </select>

            <Button variant="secondary" onClick={playSelected} disabled={selected.size === 0}>
              Play selection
            </Button>
            <Button variant="secondary" onClick={addSelectedToQueue} disabled={selected.size === 0}>
              Add to queue
            </Button>
          </div>
        </div>

        <div className="mt-3 grid gap-2 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground" htmlFor="playlist">
              Add selection to playlist
            </label>
            <select
              id="playlist"
              value={playlistId}
              onChange={(e) => setPlaylistId(e.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              aria-label="Choose playlist"
            >
              <option value="">Create new…</option>
              {playlists.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground" htmlFor="new">
              New playlist name
            </label>
            <Input
              id="new"
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              placeholder="e.g. Running"
              disabled={Boolean(playlistId)}
              className="mt-1"
            />
          </div>

          <Button
            variant="primary"
            onClick={() => void addSelectedToPlaylist()}
            disabled={selected.size === 0}
          >
            Add to playlist
          </Button>
        </div>
      </div>

      <SongList
        tracks={filtered}
        selectedIds={selected}
        onToggleSelect={toggleSelect}
        onPlay={(id) =>
          player.setQueue(filtered.map((t) => t.id), {
            startIndex: filtered.findIndex((t) => t.id === id),
            autoplay: true
          })
        }
        onEnqueue={(id) => {
          player.enqueue([id], { position: "end" });
          toast({ title: "Added to queue", description: "1 track" });
        }}
        onPlayNext={(id) => {
          player.playNext(id);
          toast({ title: "Will play next", description: "1 track" });
        }}
      />
    </div>
  );
}



import { useMemo, useRef, useState } from "react";

import { PlaylistCard } from "@/components/PlaylistCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ToastProvider";
import { db, getSettings } from "@/db/indexedDb";
import { useAllPlaylists, useAllTracks } from "@/hooks/useIndexedDb";
import type { AppSettings, Playlist, Track } from "@/types";

type ExportBundle = {
  version: 1;
  exportedAt: number;
  tracks: Track[];
  playlists: Playlist[];
  settings: AppSettings;
};

function downloadJson(filename: string, obj: unknown) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function Playlists() {
  const { toast } = useToast();
  const playlists = useAllPlaylists() ?? [];
  const tracks = useAllTracks() ?? [];

  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const trackCount = useMemo(() => new Map(tracks.map((t) => [t.id, 1])), [tracks]);

  const create = async () => {
    const n = name.trim();
    if (!n) return;
    const now = Date.now();
    const p: Playlist = { id: crypto.randomUUID(), name: n, trackIds: [], createdAt: now, updatedAt: now };
    await db.playlists.put(p);
    setName("");
    toast({ title: "Playlist created", description: p.name, variant: "success" });
  };

  const rename = async (p: Playlist) => {
    const next = window.prompt("Rename playlist", p.name)?.trim();
    if (!next) return;
    await db.playlists.put({ ...p, name: next, updatedAt: Date.now() });
    toast({ title: "Renamed", description: next, variant: "success" });
  };

  const remove = async (p: Playlist) => {
    if (!window.confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    await db.playlists.delete(p.id);
    toast({ title: "Deleted playlist", description: p.name });
  };

  const doExport = async () => {
    setBusy(true);
    const settings = await getSettings();
    const bundle: ExportBundle = {
      version: 1,
      exportedAt: Date.now(),
      tracks,
      playlists,
      settings
    };
    downloadJson(`local-music-export-${new Date().toISOString().slice(0, 10)}.json`, bundle);
    setBusy(false);
    toast({ title: "Exported metadata JSON", description: "Audio blobs are not included." });
  };

  const doImport = async (file: File) => {
    setBusy(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Partial<ExportBundle>;
      if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.playlists)) {
        throw new Error("Invalid export file");
      }

      // Restore only items that can re-link to blobs (audioBlobId present).
      const importedTracks = Array.isArray(parsed.tracks) ? parsed.tracks : [];
      let restoredTracks = 0;
      for (const t of importedTracks) {
        if (!t?.audioBlobId || !t?.id) continue;
        const blob = await db.blobs.get(t.audioBlobId);
        if (!blob) continue;
        await db.tracks.put({ ...t, updatedAt: Date.now() });
        restoredTracks++;
      }

      await db.playlists.bulkPut(
        parsed.playlists.map((p) => ({ ...p, updatedAt: Date.now() })) as Playlist[]
      );
      toast({
        title: "Imported",
        description: `Playlists restored. Tracks re-linked: ${restoredTracks}.`,
        variant: "success"
      });
    } catch (e) {
      toast({ title: "Import failed", description: e instanceof Error ? e.message : "Error", variant: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="text-2xl font-semibold">Playlists</div>
        <div className="mt-1 text-sm text-muted-foreground">
          Create, rename, delete playlists. Back up metadata JSON.
        </div>
      </div>

      <div className="card p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="flex-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground" htmlFor="name">
              New playlist name
            </label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Favorites" className="mt-1" />
          </div>
          <div className="flex gap-2">
            <Button variant="primary" onClick={() => void create()} disabled={!name.trim()}>
              Create
            </Button>
            <Button variant="secondary" onClick={() => void doExport()} disabled={busy}>
              Export JSON
            </Button>
            <Button variant="secondary" onClick={() => fileRef.current?.click()} disabled={busy}>
              Import JSON
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void doImport(f);
                e.currentTarget.value = "";
              }}
            />
          </div>
        </div>
      </div>

      {playlists.length === 0 ? (
        <div className="card p-6 text-sm text-muted-foreground">
          No playlists yet. Create one, then add songs from “All Songs”.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {playlists.map((p) => (
            <div key={p.id} className="space-y-2">
              <PlaylistCard playlist={p} trackCount={p.trackIds.filter((id) => trackCount.has(id)).length} />
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => void rename(p)}>
                  Rename
                </Button>
                <Button variant="destructive" size="sm" onClick={() => void remove(p)}>
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}



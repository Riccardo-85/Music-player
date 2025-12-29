import { useState } from "react";
import { Link } from "react-router-dom";

import { UploadDropzone } from "@/components/UploadDropzone";
import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/Progress";
import { useToast } from "@/components/ToastProvider";
import { db } from "@/db/indexedDb";
import { sha256Hex } from "@/lib/hash";
import { parseId3FromFile } from "@/lib/id3";
import type { BlobDoc, Track } from "@/types";
import { seedDemoLibrary } from "@/dev/seedDemo";

type ImportRow = {
  id: string;
  filename: string;
  status: "pending" | "hashing" | "parsing" | "saving" | "done" | "skipped" | "error";
  message?: string;
};

export function Upload() {
  const { toast } = useToast();
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [busy, setBusy] = useState(false);

  const doneCount = rows.filter((r) => r.status === "done").length;
  const skippedCount = rows.filter((r) => r.status === "skipped").length;
  const errorCount = rows.filter((r) => r.status === "error").length;

  const onFiles = async (files: File[]) => {
    setBusy(true);
    let imported = 0;
    let skipped = 0;
    let errors = 0;
    const batchId = crypto.randomUUID();
    const newRows: ImportRow[] = files.map((f) => ({
      id: `${batchId}:${crypto.randomUUID()}`,
      filename: f.name,
      status: "pending"
    }));
    setRows((prev) => [...newRows, ...prev]);

    const update = (rowId: string, patch: Partial<ImportRow>) => {
      setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, ...patch } : r)));
    };

    for (const [i, file] of files.entries()) {
      const rowId = newRows[i]!.id;
      try {
        update(rowId, { status: "hashing" });
        const ab = await file.arrayBuffer();
        const contentHash = await sha256Hex(ab);

        const existing = await db.tracks.where("contentHash").equals(contentHash).first();
        if (existing) {
          update(rowId, { status: "skipped", message: "Duplicate (already in library)" });
          skipped++;
          continue;
        }

        update(rowId, { status: "parsing" });
        const tags = await parseId3FromFile(file);

        update(rowId, { status: "saving" });
        const now = Date.now();
        const audioBlobId = crypto.randomUUID();
        const artworkBlobId = tags.artwork ? crypto.randomUUID() : undefined;

        const track: Track = {
          id: crypto.randomUUID(),
          contentHash,
          filename: file.name,
          title: tags.title,
          artist: tags.artist,
          album: tags.album,
          duration: tags.duration,
          year: tags.year,
          genre: tags.genre,
          audioBlobId,
          artworkBlobId,
          createdAt: now,
          updatedAt: now
        };

        const audioDoc: BlobDoc = {
          id: audioBlobId,
          type: "audio",
          mime: file.type || "audio/mpeg",
          blob: new Blob([ab], { type: file.type || "audio/mpeg" }),
          createdAt: now
        };

        const artworkDoc: BlobDoc | undefined = tags.artwork
          ? {
              id: artworkBlobId!,
              type: "artwork",
              mime: tags.artwork.mime,
              blob: tags.artwork.blob,
              createdAt: now
            }
          : undefined;

        await db.transaction("rw", db.blobs, db.tracks, async () => {
          await db.blobs.put(audioDoc);
          if (artworkDoc) await db.blobs.put(artworkDoc);
          await db.tracks.put(track);
        });

        update(rowId, { status: "done", message: "Imported" });
        imported++;
      } catch (e) {
        update(rowId, { status: "error", message: e instanceof Error ? e.message : "Failed" });
        errors++;
      }
    }

    setBusy(false);
    toast({
      title: "Import finished",
      description: `${files.length} processed (${imported} imported, ${skipped} skipped, ${errors} errors).`
    });
  };

  const progress =
    rows.length === 0 ? 0 : (rows.filter((r) => r.status !== "pending").length / rows.length) * 100;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-2xl font-semibold">Upload</div>
          <div className="mt-1 text-sm text-muted-foreground">
            Import MP3 files into your offline library.
          </div>
        </div>
        <div className="flex items-center gap-2">
          {import.meta.env.DEV ? (
            <Button
              variant="secondary"
              onClick={async () => {
                await seedDemoLibrary();
                toast({ title: "Seeded demo tracks", variant: "success" });
              }}
            >
              Seed demo (dev)
            </Button>
          ) : null}
          <Link to="/songs">
            <Button variant="primary">Go to Songs</Button>
          </Link>
        </div>
      </div>

      <UploadDropzone disabled={busy} onFiles={onFiles} />

      {rows.length > 0 ? (
        <div className="card p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold">Import progress</div>
            <div className="text-xs text-muted-foreground">
              {doneCount} imported • {skippedCount} skipped • {errorCount} errors
            </div>
          </div>
          <div className="mt-3">
            <Progress value={progress} />
          </div>

          <ul className="mt-4 space-y-2">
            {rows.slice(0, 10).map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 rounded-md border bg-card px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{r.filename}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.status}
                    {r.message ? ` • ${r.message}` : ""}
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {rows.length > 10 ? (
            <div className="mt-3 text-xs text-muted-foreground">
              Showing 10 most recent items.
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}



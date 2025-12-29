import { db } from "@/db/indexedDb";
import { sha256Hex } from "@/lib/hash";
import type { BlobDoc, Track } from "@/types";

// Tiny 0.25s mono WAV (silence). Kept small for dev-only UI testing.
const SILENT_WAV_BASE64 =
  "UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=";

function base64ToBlob(b64: string, mime: string) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export async function seedDemoLibrary() {
  if (!import.meta.env.DEV) return;

  const existing = await db.tracks.count();
  if (existing > 0) return;

  const wavBlob = base64ToBlob(SILENT_WAV_BASE64, "audio/wav");
  const ab = await wavBlob.arrayBuffer();
  const hash = await sha256Hex(ab);

  const now = Date.now();
  const audioBlobId = crypto.randomUUID();
  const audioDoc: BlobDoc = {
    id: audioBlobId,
    type: "audio",
    mime: "audio/wav",
    blob: wavBlob,
    createdAt: now
  };

  const tracks: Track[] = [
    {
      id: crypto.randomUUID(),
      contentHash: `${hash}-1`,
      filename: "Demo Artist - First Track.wav",
      title: "First Track",
      artist: "Demo Artist",
      album: "Demo Album",
      duration: 0.25,
      year: 2025,
      genre: "Demo",
      audioBlobId,
      artworkBlobId: undefined,
      createdAt: now,
      updatedAt: now
    },
    {
      id: crypto.randomUUID(),
      contentHash: `${hash}-2`,
      filename: "Demo Artist - Second Track.wav",
      title: "Second Track",
      artist: "Demo Artist",
      album: "Demo Album",
      duration: 0.25,
      year: 2025,
      genre: "Demo",
      audioBlobId,
      artworkBlobId: undefined,
      createdAt: now + 1,
      updatedAt: now + 1
    }
  ];

  await db.transaction("rw", db.blobs, db.tracks, async () => {
    await db.blobs.put(audioDoc);
    await db.tracks.bulkPut(tracks);
  });
}



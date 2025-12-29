import type { Track } from "@/types";

export function formatDuration(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return "0:00";
  const s = Math.floor(totalSeconds);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

export function idbBlobUrl(blobId: string): string {
  return `/_idb/blob/${encodeURIComponent(blobId)}`;
}

function hashToHue(hash: string, seed: number) {
  let acc = seed;
  for (let i = 0; i < hash.length; i++) {
    acc = (acc * 33 + hash.charCodeAt(i)) % 360;
  }
  return acc;
}

export function placeholderGradient(hash: string) {
  const h1 = hashToHue(hash, 17);
  const h2 = (h1 + 55) % 360;
  return `linear-gradient(135deg, hsl(${h1} 85% 55% / .35), hsl(${h2} 85% 55% / .35))`;
}

export function initialsForTrack(track: Pick<Track, "title" | "artist">) {
  const source = track.artist?.trim() ? track.artist : track.title;
  const parts = source.split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0]?.toUpperCase() ?? "M";
  const b = (parts[1]?.[0] ?? parts[0]?.[1] ?? "").toUpperCase();
  return `${a}${b}`;
}



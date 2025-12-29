import { parseBlob } from "music-metadata-browser";

export type ParsedTags = {
  title: string;
  artist: string;
  album: string;
  duration: number; // seconds
  year?: number;
  genre?: string;
  artwork?: { mime: string; blob: Blob };
};

function guessFromFilename(filename: string): Pick<ParsedTags, "title" | "artist" | "album"> {
  const base = filename.replace(/\.[^.]+$/, "");
  const parts = base.split(" - ").map((s) => s.trim());
  if (parts.length >= 2) {
    return { artist: parts[0] || "Unknown Artist", title: parts.slice(1).join(" - ") || base, album: "Unknown Album" };
  }
  return { artist: "Unknown Artist", title: base || "Unknown Title", album: "Unknown Album" };
}

export async function parseId3FromFile(file: File): Promise<ParsedTags> {
  try {
    const metadata = await parseBlob(file, { duration: true });
    // music-metadata-browser typings are a bit inconsistent under strict TS; use runtime guards.
    const common = metadata.common as unknown as Record<string, unknown>;
    const title =
      typeof common.title === "string" ? common.title.trim() : "";
    const artist =
      typeof common.artist === "string"
        ? common.artist.trim()
        : Array.isArray(common.artists)
          ? (common.artists as unknown[])
              .filter((a): a is string => typeof a === "string" && a.trim().length > 0)
              .join(", ")
          : "";
    const album =
      typeof common.album === "string" ? common.album.trim() : "";
    const year = typeof common.year === "number" ? common.year : undefined;
    const genreRaw = common.genre;
    const genre = Array.isArray(genreRaw)
      ? (genreRaw as unknown[])
          .filter((g): g is string => typeof g === "string" && g.trim().length > 0)
          .join(", ")
      : typeof genreRaw === "string"
        ? genreRaw.trim()
        : undefined;
    const duration = Number(metadata.format.duration ?? 0) || 0;

    const picture = Array.isArray(common.picture) ? (common.picture[0] as any) : undefined;
    const toBytes = (data: unknown): Uint8Array<ArrayBuffer> => {
      const u8 =
        data instanceof Uint8Array
          ? data
          : data instanceof ArrayBuffer
            ? new Uint8Array(data)
            : ArrayBuffer.isView(data)
              ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
              : new Uint8Array();
      // Explicit copy into a fresh ArrayBuffer-backed Uint8Array to satisfy TS's `BlobPart` typing.
      const copy = new Uint8Array(u8.byteLength);
      copy.set(u8);
      return copy;
    };
    const artwork =
      picture?.data && picture.format
        ? {
            mime: picture.format,
            blob: new Blob([toBytes(picture.data)], { type: String(picture.format) })
          }
        : undefined;

    const fallback = guessFromFilename(file.name);
    return {
      title: title || fallback.title,
      artist: artist || fallback.artist,
      album: album || fallback.album,
      duration,
      year: typeof year === "number" ? year : undefined,
      genre: genre || undefined,
      artwork
    };
  } catch {
    const fallback = guessFromFilename(file.name);
    return {
      ...fallback,
      duration: 0,
      year: undefined,
      genre: undefined,
      artwork: undefined
    };
  }
}



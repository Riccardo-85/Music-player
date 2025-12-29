import { cn } from "@/lib/cn";
import { initialsForTrack, placeholderGradient, idbBlobUrl } from "@/lib/audio";
import type { Track } from "@/types";

export function Artwork({
  track,
  size = 48,
  className
}: {
  track?: Track;
  size?: number;
  className?: string;
}) {
  const hash = track?.contentHash ?? "music";
  const initials = track ? initialsForTrack(track) : "M";
  const hasArtwork = Boolean(track?.artworkBlobId);
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md border border-border bg-muted",
        className
      )}
      style={{ width: size, height: size }}
      aria-label={track ? `Artwork for ${track.title}` : "Artwork placeholder"}
    >
      {hasArtwork ? (
        <img
          src={idbBlobUrl(track!.artworkBlobId!)}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <div
          className="grid h-full w-full place-items-center text-xs font-semibold text-foreground/80"
          style={{ backgroundImage: placeholderGradient(hash) }}
        >
          {initials}
        </div>
      )}
    </div>
  );
}



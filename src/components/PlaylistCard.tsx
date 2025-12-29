import { Link } from "react-router-dom";

import { cn } from "@/lib/cn";
import type { Playlist } from "@/types";

export function PlaylistCard({
  playlist,
  trackCount
}: {
  playlist: Playlist;
  trackCount: number;
}) {
  return (
    <Link
      to={`/playlists/${playlist.id}`}
      className={cn("card block p-4 transition-colors hover:bg-muted/50")}
    >
      <div className="text-base font-semibold">{playlist.name}</div>
      <div className="mt-1 text-sm text-muted-foreground">
        {trackCount} track{trackCount === 1 ? "" : "s"}
      </div>
    </Link>
  );
}



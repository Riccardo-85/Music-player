import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { Artwork } from "@/components/Artwork";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { formatDuration } from "@/lib/audio";
import { usePlayer } from "@/hooks/usePlayer";

export function NowPlaying() {
  const {
    currentTrack,
    isPlaying,
    togglePlay,
    next,
    prev,
    currentTime,
    duration,
    seek,
    repeat,
    cycleRepeat,
    shuffle,
    toggleShuffle,
    queue,
    currentIndex,
    setQueue,
    setQueueOpen
  } = usePlayer();

  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrub, setScrub] = useState(0);

  useEffect(() => {
    if (isScrubbing) return;
    setScrub(currentTime);
  }, [currentTime, isScrubbing]);

  return (
    <div className="space-y-4">
      <div>
        <div className="text-2xl font-semibold">Now Playing</div>
        <div className="mt-1 text-sm text-muted-foreground">
          Player controls, big artwork, and quick access to your queue.
        </div>
      </div>

      {!currentTrack ? (
        <div className="card p-6">
          <div className="text-sm text-muted-foreground">
            Nothing playing. Head to{" "}
            <Link to="/songs" className="font-semibold text-primary hover:underline">
              All Songs
            </Link>{" "}
            to start.
          </div>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[420px_1fr]">
          <div className="card p-4">
            <Artwork track={currentTrack} size={380} className="mx-auto rounded-lg" />
          </div>

          <div className="card p-5">
            <div className="min-w-0">
              <div className="truncate text-2xl font-semibold">{currentTrack.title}</div>
              <div className="mt-1 truncate text-sm text-muted-foreground">
                {currentTrack.artist} • {currentTrack.album}
              </div>
            </div>

            <div className="mt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 text-right text-xs tabular-nums text-muted-foreground">
                  {formatDuration(scrub)}
                </div>
                <input
                  type="range"
                  min={0}
                  max={Math.max(1, duration || 1)}
                  step={0.25}
                  value={Math.min(scrub, duration || 1)}
                  onPointerDown={() => setIsScrubbing(true)}
                  onPointerUp={() => {
                    setIsScrubbing(false);
                    seek(scrub);
                  }}
                  onChange={(e) => setScrub(Number(e.target.value))}
                  className="h-2 w-full accent-primary"
                  aria-label="Seek"
                />
                <div className="w-12 text-xs tabular-nums text-muted-foreground">
                  {formatDuration(duration)}
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                onClick={toggleShuffle}
                aria-pressed={shuffle}
                className={cn(shuffle && "text-primary")}
              >
                Shuffle
              </Button>
              <Button variant="secondary" onClick={prev}>
                Prev
              </Button>
              <Button variant="primary" onClick={togglePlay}>
                {isPlaying ? "Pause" : "Play"}
              </Button>
              <Button variant="secondary" onClick={next}>
                Next
              </Button>
              <Button
                variant="secondary"
                onClick={cycleRepeat}
                className={cn(repeat !== "off" && "text-primary")}
              >
                Repeat: {repeat}
              </Button>
              <Button variant="secondary" onClick={() => setQueueOpen(true)}>
                Open queue
              </Button>
            </div>

            <div className="mt-6 border-t pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">Up next</div>
                  <div className="text-xs text-muted-foreground">
                    {queue.length} in queue • currently {currentIndex + 1}
                  </div>
                </div>
                <Button variant="ghost" onClick={() => setQueueOpen(true)}>
                  Manage
                </Button>
              </div>

              <ul className="mt-3 space-y-2">
                {queue.slice(currentIndex + 1, currentIndex + 6).map((id, i) => (
                  <li key={id} className="flex items-center justify-between gap-3 rounded-md border bg-card px-3 py-2">
                    <div className="text-sm text-muted-foreground">#{currentIndex + 2 + i}</div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setQueue(queue, { startIndex: currentIndex + 1 + i, autoplay: true })}
                      className="ml-auto"
                    >
                      Jump
                    </Button>
                  </li>
                ))}
                {queue.length <= currentIndex + 1 ? (
                  <li className="text-sm text-muted-foreground">Nothing queued after this track.</li>
                ) : null}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";

import {
  IconNext,
  IconPause,
  IconPlay,
  IconPrev,
  IconQueue,
  IconRepeat,
  IconShuffle
} from "@/components/Icons";
import { Artwork } from "@/components/Artwork";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { formatDuration } from "@/lib/audio";
import { usePlayer } from "@/hooks/usePlayer";
import { QueueDrawer } from "@/components/QueueDrawer";

export function PlayerBar() {
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
    isQueueOpen,
    setQueueOpen,
    queue
  } = usePlayer();

  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrub, setScrub] = useState(0);

  useEffect(() => {
    if (isScrubbing) return;
    setScrub(currentTime);
  }, [currentTime, isScrubbing]);

  const repeatLabel = useMemo(() => {
    if (repeat === "off") return "Repeat off";
    if (repeat === "all") return "Repeat all";
    return "Repeat one";
  }, [repeat]);

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/85 backdrop-blur">
        <div className="container-app grid gap-3 py-3 md:grid-cols-[1fr_1.4fr_1fr] md:items-center">
          <div className="flex min-w-0 items-center gap-3">
            <Artwork track={currentTrack} size={44} />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">
                {currentTrack ? (
                  <Link to="/now-playing" className="hover:underline">
                    {currentTrack.title}
                  </Link>
                ) : (
                  "Nothing playing"
                )}
              </div>
              <div className="truncate text-xs text-muted-foreground">
                {currentTrack ? `${currentTrack.artist} • ${currentTrack.album}` : "Upload some songs to start"}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleShuffle}
                aria-pressed={shuffle}
                aria-label="Toggle shuffle"
                className={cn(shuffle && "text-primary")}
              >
                <IconShuffle className="h-5 w-5" />
              </Button>

              <Button variant="ghost" size="sm" onClick={prev} aria-label="Previous track">
                <IconPrev className="h-5 w-5" />
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={togglePlay}
                aria-label={isPlaying ? "Pause" : "Play"}
                disabled={!currentTrack}
              >
                {isPlaying ? (
                  <IconPause className="h-5 w-5" />
                ) : (
                  <IconPlay className="h-5 w-5" />
                )}
                <span className="sr-only">{isPlaying ? "Pause" : "Play"}</span>
              </Button>

              <Button variant="ghost" size="sm" onClick={next} aria-label="Next track">
                <IconNext className="h-5 w-5" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={cycleRepeat}
                aria-label={repeatLabel}
                className={cn(repeat !== "off" && "text-primary")}
              >
                <IconRepeat className="h-5 w-5" />
                {repeat === "one" ? (
                  <span className="ml-[-6px] text-[11px] font-bold">1</span>
                ) : null}
              </Button>
            </div>

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
                disabled={!currentTrack}
              />
              <div className="w-12 text-xs tabular-nums text-muted-foreground">
                {formatDuration(duration)}
              </div>
            </div>
          </div>

          <div className="hidden items-center justify-end gap-2 md:flex">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setQueueOpen(!isQueueOpen)}
              aria-expanded={isQueueOpen}
              aria-controls="queue-drawer"
            >
              <IconQueue className="h-5 w-5" />
              Queue
              <span className="ml-1 text-xs text-muted-foreground">({queue.length})</span>
            </Button>
          </div>

          <div className="md:hidden">
            <Button
              variant="secondary"
              size="sm"
              className="w-full"
              onClick={() => setQueueOpen(!isQueueOpen)}
              aria-expanded={isQueueOpen}
              aria-controls="queue-drawer"
            >
              <IconQueue className="h-5 w-5" />
              Queue ({queue.length})
            </Button>
          </div>
        </div>
      </div>

      <QueueDrawer />
    </>
  );
}



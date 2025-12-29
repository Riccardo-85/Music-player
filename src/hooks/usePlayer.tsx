import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from "react";

import { db, getSettings, setSettings } from "@/db/indexedDb";
import { idbBlobUrl } from "@/lib/audio";
import type { AppSettings, RepeatMode, Track } from "@/types";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

type PlayerCtx = {
  audioRef: React.RefObject<HTMLAudioElement>;
  currentTrack?: Track;
  currentTrackId?: string;
  isPlaying: boolean;
  currentTime: number;
  duration: number;

  queue: string[];
  currentIndex: number;
  isQueueOpen: boolean;

  repeat: RepeatMode;
  shuffle: boolean;
  settings?: AppSettings;

  setQueueOpen: (open: boolean) => void;
  setTheme: (theme: AppSettings["theme"]) => void;
  togglePlay: () => void;
  play: () => void;
  pause: () => void;
  seek: (timeSeconds: number) => void;
  next: () => void;
  prev: () => void;

  setQueue: (ids: string[], opts?: { startIndex?: number; autoplay?: boolean }) => void;
  enqueue: (ids: string[], opts?: { position?: "end" | "next" }) => void;
  playNext: (id: string) => void;
  removeAt: (index: number) => void;
  clearQueue: () => void;
  reorderQueue: (fromIndex: number, toIndex: number) => void;

  cycleRepeat: () => void;
  toggleShuffle: () => void;
};

const PlayerContext = createContext<PlayerCtx | null>(null);

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function moveItem<T>(arr: T[], from: number, to: number) {
  const next = arr.slice();
  const [item] = next.splice(from, 1);
  if (item === undefined) return next;
  next.splice(to, 0, item);
  return next;
}

function shuffleKeepCurrent(queue: string[], currentIndex: number) {
  const current = queue[currentIndex];
  if (current === undefined) return { queue, index: currentIndex };
  const rest = queue.filter((_, i) => i !== currentIndex);
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = rest[i];
    const b = rest[j];
    if (a === undefined || b === undefined) continue;
    rest[i] = b;
    rest[j] = a;
  }
  return { queue: [current, ...rest], index: 0 };
}

function applyTheme(theme: AppSettings["theme"]) {
  const root = document.documentElement;
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  const effective = theme === "system" ? (prefersDark ? "dark" : "light") : theme;
  root.classList.toggle("light", effective === "light");
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [settings, setSettingsState] = useState<AppSettings>();

  const [queue, setQueueState] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentTrackId = queue[currentIndex];

  const [currentTrack, setCurrentTrack] = useState<Track>();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [repeat, setRepeat] = useState<RepeatMode>("off");
  const [shuffle, setShuffle] = useState(false);
  const [isQueueOpen, setQueueOpen] = useState(false);

  // Boot from settings.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const s = await getSettings();
      if (cancelled) return;
      setSettingsState(s);
      setQueueState(s.lastQueue ?? []);
      setCurrentIndex(clamp(s.lastIndex ?? 0, 0, Math.max(0, (s.lastQueue ?? []).length - 1)));
      setRepeat(s.repeat ?? "off");
      setShuffle(Boolean(s.shuffle));
      applyTheme(s.theme);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Keep theme in sync.
  useEffect(() => {
    if (!settings) return;
    applyTheme(settings.theme);
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mq) return;
    const onChange = () => applyTheme(settings.theme);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, [settings?.theme]);

  // Load current track doc.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!currentTrackId) {
        setCurrentTrack(undefined);
        return;
      }
      const t = await db.tracks.get(currentTrackId);
      if (cancelled) return;
      setCurrentTrack(t ?? undefined);
      setDuration(t?.duration ?? 0);
    })();
    return () => {
      cancelled = true;
    };
  }, [currentTrackId]);

  // Load audio source when track changes.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!currentTrack) {
      audio.removeAttribute("src");
      audio.load();
      setCurrentTime(0);
      setDuration(0);
      return;
    }
    audio.src = idbBlobUrl(currentTrack.audioBlobId);
    audio.load();
    const resumePosition =
      settings?.lastTrackId === currentTrack.id ? settings?.lastPosition ?? 0 : 0;
    audio.currentTime = Math.max(0, resumePosition);
    setCurrentTime(audio.currentTime);
    // Autoplay if already in playing state.
    if (isPlaying) {
      void audio.play().catch(() => setIsPlaying(false));
    }
  }, [currentTrack?.id, currentTrack?.audioBlobId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Audio event wiring.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onLoaded = () => setDuration(Number(audio.duration || currentTrack?.duration || 0));
    const onEnded = () => {
      if (repeat === "one") {
        audio.currentTime = 0;
        void audio.play();
        return;
      }
      if (currentIndex < queue.length - 1) {
        setCurrentIndex((i) => i + 1);
        setIsPlaying(true);
        return;
      }
      if (repeat === "all" && queue.length > 0) {
        setCurrentIndex(0);
        setIsPlaying(true);
        return;
      }
      setIsPlaying(false);
    };

    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("durationchange", onLoaded);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("durationchange", onLoaded);
      audio.removeEventListener("ended", onEnded);
    };
  }, [currentIndex, queue.length, repeat, currentTrack?.duration]);

  // Smooth time tracking (requestAnimationFrame).
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !isPlaying) return;
    let raf = 0;
    const tick = () => {
      setCurrentTime(audio.currentTime);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying]);

  const debouncedPosition = useDebouncedValue(currentTime, 1200);

  // Persist session state (debounced by simple timeout).
  useEffect(() => {
    if (!settings) return;
    const t = window.setTimeout(() => {
      void setSettings({
        lastQueue: queue,
        lastIndex: currentIndex,
        lastTrackId: currentTrackId,
        lastPosition: debouncedPosition,
        repeat,
        shuffle
      }).then((s) => setSettingsState(s));
    }, 500);
    return () => window.clearTimeout(t);
  }, [queue, currentIndex, currentTrackId, debouncedPosition, repeat, shuffle, settings]);

  // Media Session API
  useEffect(() => {
    const ms = navigator.mediaSession;
    if (!ms) return;
    if (!currentTrack) {
      ms.metadata = null;
      return;
    }
    const artwork =
      currentTrack.artworkBlobId
        ? [{ src: idbBlobUrl(currentTrack.artworkBlobId) }]
        : [];
    ms.metadata = new MediaMetadata({
      title: currentTrack.title,
      artist: currentTrack.artist,
      album: currentTrack.album,
      artwork
    });

    const onPlay = () => void audioRef.current?.play();
    const onPause = () => audioRef.current?.pause();
    const onNext = () => next();
    const onPrev = () => prev();
    const onSeekTo = (details: MediaSessionActionDetails) => {
      if (details.seekTime == null) return;
      seek(details.seekTime);
    };

    ms.setActionHandler("play", onPlay);
    ms.setActionHandler("pause", onPause);
    ms.setActionHandler("nexttrack", onNext);
    ms.setActionHandler("previoustrack", onPrev);
    ms.setActionHandler("seekto", onSeekTo);
  }, [currentTrack?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const play = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    void audio.play().catch(() => setIsPlaying(false));
  }, []);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) void audio.play().catch(() => setIsPlaying(false));
    else audio.pause();
  }, []);

  const seek = useCallback((timeSeconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const next = clamp(timeSeconds, 0, Number.isFinite(audio.duration) ? audio.duration : 1e9);
    const maybe = audio as HTMLMediaElement & { fastSeek?: (t: number) => void };
    if (typeof maybe.fastSeek === "function") maybe.fastSeek(next);
    else audio.currentTime = next;
    setCurrentTime(next);
  }, []);

  const next = useCallback(() => {
    setCurrentIndex((i) => {
      if (queue.length === 0) return 0;
      if (i < queue.length - 1) return i + 1;
      if (repeat === "all") return 0;
      return i;
    });
    setIsPlaying(true);
  }, [queue.length, repeat]);

  const prev = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) {
      seek(0);
      return;
    }
    setCurrentIndex((i) => Math.max(0, i - 1));
    setIsPlaying(true);
  }, [seek]);

  const setQueue = useCallback(
    (ids: string[], opts?: { startIndex?: number; autoplay?: boolean }) => {
      const unique = Array.from(new Set(ids)).filter(Boolean);
      setQueueState(unique);
      const idx = clamp(opts?.startIndex ?? 0, 0, Math.max(0, unique.length - 1));
      setCurrentIndex(idx);
      setIsPlaying(Boolean(opts?.autoplay ?? true));
    },
    []
  );

  const enqueue = useCallback(
    (ids: string[], opts?: { position?: "end" | "next" }) => {
      const nextIds = ids.filter(Boolean);
      if (nextIds.length === 0) return;
      setQueueState((prev) => {
        const deduped = nextIds.filter((id) => !prev.includes(id));
        if (deduped.length === 0) return prev;
        if (opts?.position === "next" && prev.length > 0) {
          const insertAt = clamp(currentIndex + 1, 0, prev.length);
          const copy = prev.slice();
          copy.splice(insertAt, 0, ...deduped);
          return copy;
        }
        return [...prev, ...deduped];
      });
    },
    [currentIndex]
  );

  const playNext = useCallback((id: string) => enqueue([id], { position: "next" }), [enqueue]);

  const removeAt = useCallback(
    (index: number) => {
      setQueueState((prev) => prev.filter((_, i) => i !== index));
      setCurrentIndex((i) => {
        if (index < i) return i - 1;
        if (index === i) return Math.max(0, i - 1);
        return i;
      });
    },
    []
  );

  const clearQueue = useCallback(() => {
    setQueueState([]);
    setCurrentIndex(0);
    setIsPlaying(false);
    setCurrentTime(0);
  }, []);

  const reorderQueue = useCallback((fromIndex: number, toIndex: number) => {
    setQueueState((prev) => moveItem(prev, fromIndex, toIndex));
    setCurrentIndex((idx) => {
      if (idx === fromIndex) return toIndex;
      if (fromIndex < idx && toIndex >= idx) return idx - 1;
      if (fromIndex > idx && toIndex <= idx) return idx + 1;
      return idx;
    });
  }, []);

  const cycleRepeat = useCallback(() => {
    setRepeat((r) => (r === "off" ? "all" : r === "all" ? "one" : "off"));
  }, []);

  const toggleShuffle = useCallback(() => {
    setShuffle((s) => {
      const next = !s;
      if (next) {
        const res = shuffleKeepCurrent(queue, currentIndex);
        setQueueState(res.queue);
        setCurrentIndex(res.index);
      }
      return next;
    });
  }, [queue, currentIndex]);

  const setTheme = useCallback(async (theme: AppSettings["theme"]) => {
    const s = await setSettings({ theme });
    setSettingsState(s);
  }, []);

  const value = useMemo<PlayerCtx>(
    () => ({
      audioRef,
      currentTrack,
      currentTrackId,
      isPlaying,
      currentTime,
      duration,
      queue,
      currentIndex,
      isQueueOpen,
      repeat,
      shuffle,
      settings,
      setQueueOpen,
      setTheme,
      togglePlay,
      play,
      pause,
      seek,
      next,
      prev,
      setQueue,
      enqueue,
      playNext,
      removeAt,
      clearQueue,
      reorderQueue,
      cycleRepeat,
      toggleShuffle
    }),
    [
      currentTrack,
      currentTrackId,
      isPlaying,
      currentTime,
      duration,
      queue,
      currentIndex,
      isQueueOpen,
      repeat,
      shuffle,
      settings,
      setTheme,
      togglePlay,
      play,
      pause,
      seek,
      next,
      prev,
      setQueue,
      enqueue,
      playNext,
      removeAt,
      clearQueue,
      reorderQueue,
      cycleRepeat,
      toggleShuffle
    ]
  );

  return (
    <PlayerContext.Provider value={value}>
      {children}
      {/* Keep a single shared audio element for the whole app */}
      <audio ref={audioRef} preload="metadata" />
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within PlayerProvider");
  return ctx;
}



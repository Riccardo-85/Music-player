export type BlobType = "audio" | "artwork";

export type BlobDoc = {
  id: string;
  type: BlobType;
  mime: string;
  blob: Blob;
  createdAt: number;
};

export type Track = {
  id: string;
  contentHash: string;
  filename: string;
  title: string;
  artist: string;
  album: string;
  duration: number; // seconds
  year?: number;
  genre?: string;
  audioBlobId: string;
  artworkBlobId?: string;
  createdAt: number;
  updatedAt: number;
};

export type Playlist = {
  id: string;
  name: string;
  trackIds: string[];
  createdAt: number;
  updatedAt: number;
};

export type RepeatMode = "off" | "one" | "all";

export type ThemeMode = "system" | "dark" | "light";

export type AppSettings = {
  id: "settings";
  theme: ThemeMode;
  repeat: RepeatMode;
  shuffle: boolean;
  lastQueue: string[];
  lastIndex: number;
  lastTrackId?: string;
  lastPosition: number;
  updatedAt: number;
};

export type QueueState = {
  queue: string[];
  currentIndex: number;
};



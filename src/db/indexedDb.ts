import Dexie, { type Table } from "dexie";

import type { AppSettings, BlobDoc, Playlist, Track } from "@/types";

export const DB_NAME = "local-music-db";

export class LocalMusicDB extends Dexie {
  tracks!: Table<Track, string>;
  blobs!: Table<BlobDoc, string>;
  playlists!: Table<Playlist, string>;
  app!: Table<AppSettings, "settings">;

  constructor() {
    super(DB_NAME);

    // Versioning: bump when schema changes and add upgrade() blocks.
    this.version(1).stores({
      tracks:
        "id, &contentHash, createdAt, updatedAt, title, artist, album, duration",
      blobs: "id, type, createdAt",
      playlists: "id, name, createdAt, updatedAt",
      app: "id"
    });
  }
}

export const db = new LocalMusicDB();

export const DEFAULT_SETTINGS: AppSettings = {
  id: "settings",
  theme: "system",
  repeat: "off",
  shuffle: false,
  lastQueue: [],
  lastIndex: 0,
  lastTrackId: undefined,
  lastPosition: 0,
  updatedAt: Date.now()
};

export async function getSettings(): Promise<AppSettings> {
  const existing = await db.app.get("settings");
  if (existing) return existing;
  await db.app.put(DEFAULT_SETTINGS);
  return DEFAULT_SETTINGS;
}

export async function setSettings(patch: Partial<Omit<AppSettings, "id">>) {
  const current = await getSettings();
  const next: AppSettings = {
    ...current,
    ...patch,
    id: "settings",
    updatedAt: Date.now()
  };
  await db.app.put(next);
  return next;
}



import { useLiveQuery } from "dexie-react-hooks";

import { db } from "@/db/indexedDb";
import type { Playlist, Track } from "@/types";

export function useAllTracks() {
  return useLiveQuery(async () => {
    return await db.tracks.orderBy("createdAt").reverse().toArray();
  }, []);
}

export function useTrackById(id: string | undefined) {
  return useLiveQuery(async () => {
    if (!id) return undefined;
    return await db.tracks.get(id);
  }, [id]);
}

export function useAllPlaylists() {
  return useLiveQuery(async () => {
    return await db.playlists.orderBy("updatedAt").reverse().toArray();
  }, []);
}

export function usePlaylistById(id: string | undefined) {
  return useLiveQuery(async () => {
    if (!id) return undefined;
    return await db.playlists.get(id);
  }, [id]);
}

export async function getTracksByIds(ids: string[]): Promise<Track[]> {
  if (ids.length === 0) return [];
  const found = await db.tracks.bulkGet(ids);
  const map = new Map<string, Track>();
  for (const t of found) if (t) map.set(t.id, t);
  return ids.map((id) => map.get(id)).filter(Boolean) as Track[];
}

export async function upsertPlaylist(p: Playlist) {
  await db.playlists.put(p);
}



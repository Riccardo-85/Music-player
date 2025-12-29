/// <reference lib="webworker" />

import { openDB } from "idb";
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";

const DB_NAME = "local-music-db";
const DB_VERSION = 1;

declare let self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

const appShellHandler = createHandlerBoundToURL("/index.html");

registerRoute(
  new NavigationRoute(async (context) => {
    try {
      return await appShellHandler(context);
    } catch {
      const cached = await caches.match("/offline.html");
      return cached ?? Response.error();
    }
  })
);

async function getBlobRecord(id: string): Promise<{ mime: string; blob: Blob } | undefined> {
  const db = await openDB(DB_NAME, DB_VERSION);
  const doc = (await db.get("blobs", id)) as any;
  if (!doc?.blob) return undefined;
  return { mime: doc.mime ?? doc.blob.type ?? "application/octet-stream", blob: doc.blob as Blob };
}

function parseRange(rangeHeader: string | null, size: number) {
  if (!rangeHeader) return undefined;
  const m = /bytes=(\d*)-(\d*)/.exec(rangeHeader);
  if (!m) return undefined;
  const start = m[1] ? Number(m[1]) : 0;
  const end = m[2] ? Number(m[2]) : size - 1;
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < start) return undefined;
  return { start, end: Math.min(end, size - 1) };
}

registerRoute(
  ({ url }) => url.pathname.startsWith("/_idb/blob/"),
  async ({ request, url }) => {
    const id = decodeURIComponent(url.pathname.replace("/_idb/blob/", ""));
    const rec = await getBlobRecord(id);
    if (!rec) return new Response("Not found", { status: 404 });

    const size = rec.blob.size;
    const range = parseRange(request.headers.get("range"), size);
    if (range) {
      const chunk = rec.blob.slice(range.start, range.end + 1);
      return new Response(chunk, {
        status: 206,
        headers: {
          "Content-Type": rec.mime,
          "Content-Range": `bytes ${range.start}-${range.end}/${size}`,
          "Accept-Ranges": "bytes",
          "Content-Length": String(chunk.size),
          "Cache-Control": "no-store"
        }
      });
    }

    return new Response(rec.blob, {
      headers: {
        "Content-Type": rec.mime,
        "Accept-Ranges": "bytes",
        "Cache-Control": "no-store"
      }
    });
  }
);

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});



import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url))
    }
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      includeAssets: ["offline.html", "icons/icon-192.svg", "icons/icon-512.svg"],
      manifest: {
        name: "Local Music",
        short_name: "Local Music",
        description: "Offline-first local music player (Spotify-style) using IndexedDB",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#0b0f19",
        theme_color: "#0b0f19",
        icons: [
          {
            src: "/icons/icon-192.svg",
            sizes: "192x192",
            type: "image/svg+xml",
            purpose: "any"
          },
          {
            src: "/icons/icon-512.svg",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "any maskable"
          }
        ]
      }
    })
  ],
  server: { port: 5173 }
});



import { createBrowserRouter, Navigate } from "react-router-dom";

import { RootLayout } from "@/ui/RootLayout";
import { NowPlaying } from "@/pages/NowPlaying";
import { PlaylistDetail } from "@/pages/PlaylistDetail";
import { Playlists } from "@/pages/Playlists";
import { Songs } from "@/pages/Songs";
import { Upload } from "@/pages/Upload";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { index: true, element: <Navigate to="/songs" replace /> },
      { path: "upload", element: <Upload /> },
      { path: "songs", element: <Songs /> },
      { path: "playlists", element: <Playlists /> },
      { path: "playlists/:id", element: <PlaylistDetail /> },
      { path: "now-playing", element: <NowPlaying /> }
    ]
  }
]);



import { RouterProvider } from "react-router-dom";

import { ToastProvider } from "@/components/ToastProvider";
import { PlayerProvider } from "@/hooks/usePlayer";
import { router } from "@/router";

export function App() {
  return (
    <ToastProvider>
      <PlayerProvider>
        <RouterProvider router={router} />
      </PlayerProvider>
    </ToastProvider>
  );
}



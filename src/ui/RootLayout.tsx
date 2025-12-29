import { NavLink, Outlet, useLocation } from "react-router-dom";

import { PlayerBar } from "@/components/PlayerBar";
import { TopBar } from "@/components/TopBar";
import { cn } from "@/lib/cn";

function NavItem({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
          isActive && "bg-muted text-foreground"
        )
      }
    >
      {label}
    </NavLink>
  );
}

export function RootLayout() {
  const location = useLocation();

  return (
    <div className="min-h-dvh">
      <TopBar />

      <div className="container-app grid gap-6 pb-28 pt-5 md:grid-cols-[240px_1fr] md:pb-24">
        <aside className="hidden md:block">
          <div className="card p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Library
            </div>
            <nav className="mt-2 flex flex-col gap-1">
              <NavItem to="/upload" label="Upload" />
              <NavItem to="/songs" label="All Songs" />
              <NavItem to="/playlists" label="Playlists" />
              <NavItem to="/now-playing" label="Now Playing" />
            </nav>
          </div>
          <div className="mt-4 text-xs text-muted-foreground">
            Offline-first. Your music stays on this device.
          </div>
        </aside>

        <main className="min-w-0">
          {/* Page heading for screen readers */}
          <h1 className="sr-only">Local Music {location.pathname}</h1>
          <Outlet />
        </main>
      </div>

      <PlayerBar />
    </div>
  );
}



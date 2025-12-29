import { Link, NavLink } from "react-router-dom";

import { IconMusic, IconSunMoon } from "@/components/Icons";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { usePlayer } from "@/hooks/usePlayer";

function MobileNavItem({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground",
          isActive && "bg-muted text-foreground"
        )
      }
    >
      {label}
    </NavLink>
  );
}

export function TopBar() {
  const { settings, setTheme } = usePlayer();
  const theme = settings?.theme ?? "system";

  return (
    <header className="sticky top-0 z-40 border-b bg-background/75 backdrop-blur">
      <div className="container-app flex items-center justify-between gap-3 py-3">
        <Link to="/songs" className="flex items-center gap-2">
          <IconMusic className="h-6 w-6 text-primary" />
          <div className="font-semibold tracking-tight">Local Music</div>
        </Link>

        <div className="hidden items-center gap-2 md:flex">
          <Button
            variant="ghost"
            onClick={() =>
              setTheme(theme === "dark" ? "light" : theme === "light" ? "system" : "dark")
            }
            aria-label="Toggle theme (dark, light, system)"
          >
            <IconSunMoon className="h-5 w-5" />
            <span className="hidden sm:inline">Theme</span>
          </Button>
        </div>
      </div>

      <div className="container-app pb-3 md:hidden">
        <nav className="flex gap-2">
          <MobileNavItem to="/upload" label="Upload" />
          <MobileNavItem to="/songs" label="Songs" />
          <MobileNavItem to="/playlists" label="Playlists" />
          <MobileNavItem to="/now-playing" label="Player" />
        </nav>
      </div>
    </header>
  );
}



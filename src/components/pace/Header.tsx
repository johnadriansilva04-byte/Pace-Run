import { Link } from "@tanstack/react-router";
import { Images, Settings, Trophy } from "lucide-react";

export function Logo({ to = "/inicio" }: { to?: "/" | "/inicio" }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2 font-display text-xl font-bold tracking-wider"
      aria-label="PACE RUN"
    >
      <span className="grid h-8 w-8 place-items-center rounded-md bg-speed text-primary-foreground">
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M4 16a8 8 0 1 1 16 0" />
          <path d="M12 16l4-6" />
        </svg>
      </span>
      PACE<span className="text-primary">RUN</span>
    </Link>
  );
}

export function Header({ logoTo = "/inicio" }: { logoTo?: "/" | "/inicio" }) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 pt-safe">
        <Logo to={logoTo} />
        <nav className="flex items-center gap-1">
          <Link
            to="/galeria"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <Images className="h-4 w-4" />
            <span className="hidden sm:inline">Galeria</span>
          </Link>
          <Link
            to="/conquistas"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <Trophy className="h-4 w-4" />
            <span className="hidden sm:inline">Conquistas</span>
          </Link>
          <Link
            to="/configuracoes"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Configurações</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}

import { Link, useLocation } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import pmLogo from "@/assets/pm-logo.png.asset.json";

const items = [
  { to: "/", label: "INICIAL" },
  { to: "/novo", label: "Novo Registro" },
  { to: "/relatorio-visualizar", label: "Visualizar Relatório" },
] as const;

export function AppNav() {
  const { pathname } = useLocation();
  return (
    <header className="sticky top-0 z-40 border-b border-pm-gold/40 bg-pm-navy text-primary-foreground shadow-md">
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3">
        <div className="flex items-center gap-3 font-semibold tracking-wide">
          <img src={pmLogo.url} alt="Brasão PM" className="h-9 w-9 object-contain drop-shadow" />
          <span className="hidden sm:inline">Mapa Força Diário · 24º BPM/I</span>
        </div>
        <nav className="ml-auto flex flex-wrap items-center gap-1">
          {items.map((it) => {
            const active = pathname === it.to;
            return (
              <Link
                key={it.to}
                to={it.to}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-white/15 text-white"
                    : "text-white/80 hover:bg-white/10 hover:text-white",
                )}
              >
                {it.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

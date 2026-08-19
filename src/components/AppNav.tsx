import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import pmLogo from "@/assets/pm-logo.png.asset.json";
import { getSession, logout } from "@/lib/auth.functions";
import { LogOut, User, ShieldCheck } from "lucide-react";
import { Button } from "./ui/button";

const items = [
  { to: "/", label: "INICIAL" },
  { to: "/novo", label: "Novo Registro" },
  { to: "/relatorio-visualizar", label: "Visualizar Relatório" },
] as const;

export function AppNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: () => getSession(),
  });

  const logoutMutation = useMutation({
    mutationFn: () => logout(),
    onSuccess: () => {
      queryClient.setQueryData(["session"], null);
      navigate({ to: "/auth/login" });
    },
  });

  const navItems = [
    { to: "/", label: "INICIAL", show: true },
    { to: "/novo", label: "Novo Registro", show: true },
    { to: "/relatorio-visualizar", label: "Visualizar Relatório", show: true },
    { to: "/admin/usuarios", label: "Gerenciar Usuários", show: session?.group === "Administrador" },
  ].filter(it => it.show);

    <header className="sticky top-0 z-40 border-b border-pm-gold/40 bg-pm-navy text-primary-foreground shadow-md">
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3">
        <div className="flex items-center gap-3 font-semibold tracking-wide">
          <img src={pmLogo.url} alt="Brasão PM" className="h-9 w-9 object-contain drop-shadow" />
          <span className="hidden sm:inline">Mapa Força Diário · 24º BPM/I</span>
        </div>
        <nav className="ml-auto flex flex-wrap items-center gap-1 sm:gap-2">
          {navItems.map((it) => {
            const active = pathname === it.to;
            return (
              <Link
                key={it.to}
                to={it.to}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs sm:text-sm transition-colors",
                  active
                    ? "bg-white/15 text-white"
                    : "text-white/80 hover:bg-white/10 hover:text-white",
                )}
              >
                {it.label}
              </Link>
            );
          })}

          {session && (
            <div className="ml-2 flex items-center gap-2 border-l border-white/20 pl-2">
              <div className="hidden flex-col items-end sm:flex">
                <span className="text-[10px] font-bold uppercase leading-none text-pm-gold">
                  {session.group}
                </span>
                <span className="max-w-[120px] truncate text-xs text-white/90">
                  {session.name}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => logoutMutation.mutate()}
                className="h-8 w-8 text-white/80 hover:bg-white/10 hover:text-white"
                title="Sair"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}

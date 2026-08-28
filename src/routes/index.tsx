import { createFileRoute, redirect } from '@tanstack/react-router'
import { getSession } from '@/lib/auth.functions'
import { useSuspenseQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Search, RefreshCw, Clock, MapPin, Car, Users, Shield, ArrowUpDown, Trash2, Lock, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { AppNav } from "@/components/AppNav";
import { RecordForm } from "@/components/RecordForm";
import { getLookups, getRecords, deleteRecord } from "@/lib/sheets.functions";
import { FIELD_LABELS } from "@/lib/sheets.constants";
import type { RecordRow } from "@/lib/sheets.server";
import { HEADERS as ALL_HEADERS, CIA_ORDER, CIDADE_ORDER } from "@/lib/sheets.server";

const HEADERS = ALL_HEADERS.filter(
  (h) => h !== "id" && h !== "criadoEM" && h !== "createdByDevice" && h !== "updatedAt",
);


const recordsQuery = {
  queryKey: ["records"],
  queryFn: () => getRecords(),
};
const lookupsQuery = {
  queryKey: ["lookups"],
  queryFn: () => getLookups(),
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mapa Força Diário · 24º BPM/I" },
      {
        name: "description",
        content:
          "Dashboard do Mapa Força Diário da Polícia Militar com filtro automático pelo dia atual.",
      },
    ],
  }),
  beforeLoad: async ({ context }) => {
    const session = await context.queryClient.ensureQueryData({
      queryKey: ["session"],
      queryFn: () => getSession(),
    });
    if (!session) throw redirect({ to: "/auth/login" });
    return { session };
  },
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(recordsQuery);
    context.queryClient.ensureQueryData(lookupsQuery);
  },
  component: Dashboard,
  errorComponent: ({ error }) => (
    <div className="p-8 text-sm text-destructive">{error.message}</div>
  ),
});

const PAGE_SIZE = 15;

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function tomorrowISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function timeValue(t: string): number {
  const [h, m] = t.trim().split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return -1;
  return h * 60 + m;
}

function Dashboard() {
  const { session } = Route.useRouteContext();
  const { data: allRecords } = useSuspenseQuery(recordsQuery);

  const records = useMemo(() => {
    return allRecords;
  }, [allRecords]);
  const today = todayISO();
  const tomorrow = tomorrowISO();
  const [dayFilter, setDayFilter] = useState<"hoje" | "amanha">("hoje");
  const activeDate = dayFilter === "hoje" ? today : tomorrow;
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<keyof RecordRow>("horaInicio");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editRow, setEditRow] = useState<RecordRow | null>(null);
  const [confirmDel, setConfirmDel] = useState<RecordRow | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [shiftFilter, setShiftFilter] = useState<"matutino" | "vespertino" | "noturno" | null>(null);


  const queryClient = useQueryClient();

  useEffect(() => {
    const interval = setInterval(() => {
      console.log("Auto-refreshing records...");
      queryClient.invalidateQueries({ queryKey: ["records"] });
      setLastUpdated(new Date());
    }, 120000); // 2 minutos

    return () => clearInterval(interval);
  }, [queryClient]);

  const delFn = useServerFn(deleteRecord);
  const delMutation = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Registro excluído.");
      setConfirmDel(null);
      queryClient.invalidateQueries({ queryKey: ["records"] });
      setLastUpdated(new Date());
    },
    onError: (e: Error) => toast.error(e.message),
  });



  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = records.filter((r) => r.data === activeDate);
    if (shiftFilter) {
      rows = rows.filter((r) => {
        const v = timeValue(r.horaInicio || "");
        if (v < 0) return false;
        if (shiftFilter === "matutino") return v <= 12 * 60;
        if (shiftFilter === "vespertino") return v > 12 * 60 && v <= 17 * 60 + 30;
        return v > 17 * 60 + 30;
      });
    }
    if (q) {
      rows = rows.filter((r) =>
        HEADERS.some((h) => (r[h] || "").toLowerCase().includes(q)),
      );
    }
    rows = [...rows].sort((a, b) => {
      const av = (a[sortKey] || "").toString();
      const bv = (b[sortKey] || "").toString();
      const cmp = av.localeCompare(bv, "pt-BR", { numeric: true });
      if (cmp !== 0) return sortDir === "asc" ? cmp : -cmp;
      // desempate por hora de início para manter ordem previsível
      return (a.horaInicio || "").localeCompare(b.horaInicio || "", "pt-BR", { numeric: true });
    });

    return rows;
  }, [records, activeDate, search, sortKey, sortDir, shiftFilter]);

  const groupedRows = useMemo(() => {
    const groupKey: keyof RecordRow =
      sortKey === "cia" || sortKey === "modalidade" || sortKey === "cidade"
        ? sortKey
        : "cia";
    const map = new Map<string, RecordRow[]>();
    for (const r of filtered) {
      const key = (r[groupKey] as string) || "—";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    const keys = Array.from(map.keys()).sort((a, b) => {
      if (groupKey === "cia") {
        const ia = CIA_ORDER.indexOf(a);
        const ib = CIA_ORDER.indexOf(b);
        if (ia !== -1 && ib !== -1) return ia - ib;
        if (ia !== -1) return -1;
        if (ib !== -1) return 1;
      }
      if (groupKey === "cidade") {
        const ia = CIDADE_ORDER.indexOf(a.toUpperCase().trim());
        const ib = CIDADE_ORDER.indexOf(b.toUpperCase().trim());
        if (ia !== -1 && ib !== -1) return ia - ib;
        if (ia !== -1) return -1;
        if (ib !== -1) return 1;
      }
      const cmp = a.localeCompare(b, "pt-BR");
      return sortDir === "asc" ? cmp : -cmp;
    });
    return keys.map((k) => {
      const rows = [...map.get(k)!];
      if (groupKey === "cia") {
        rows.sort((a, b) => {
          const modA = (a.modalidade || "").toUpperCase().trim();
          const modB = (b.modalidade || "").toUpperCase().trim();
          if (modA !== modB) return modA.localeCompare(modB, "pt-BR");
          return (a.horaInicio || "").localeCompare(b.horaInicio || "", "pt-BR", { numeric: true });
        });
      }
      return [k, rows] as const;
    });
  }, [filtered, sortKey, sortDir]);


  function toggleSort(k: keyof RecordRow) {
    if (k === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir("asc");
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-pm-navy">
                Mapa Força · {new Date(activeDate + "T00:00").toLocaleDateString("pt-BR")}
              </h1>

              <div className="inline-flex overflow-hidden rounded-md border border-pm-navy/30">
                <button
                  type="button"
                  onClick={() => { setDayFilter("hoje"); setPage(1); }}
                  className={`px-3 py-1 text-xs font-semibold uppercase tracking-wide transition ${dayFilter === "hoje" ? "bg-pm-navy text-primary-foreground" : "bg-card text-pm-navy hover:bg-muted"}`}
                >
                  Hoje
                </button>
                <button
                  type="button"
                  onClick={() => { setDayFilter("amanha"); setPage(1); }}
                  className={`px-3 py-1 text-xs font-semibold uppercase tracking-wide transition ${dayFilter === "amanha" ? "bg-pm-navy text-primary-foreground" : "bg-card text-pm-navy hover:bg-muted"}`}
                >
                  Amanhã
                </button>
              </div>

              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/80">
                <RefreshCw className="h-2.5 w-2.5 animate-spin-slow" />
                <span>Atualizado às {lastUpdated.toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              Exibindo registros de {dayFilter === "hoje" ? "hoje" : "amanhã"} ({filtered.length}{" "}
              {filtered.length === 1 ? "registro" : "registros"}).
            </p>
          </div>

          <div className="flex w-full items-center gap-2 sm:w-auto">
            <div className="relative hidden flex-1 sm:block sm:flex-none">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Pesquisar..."
                className="w-full pl-8 sm:w-64"
              />
            </div>

            <Button
              variant="outline"
              size="icon"
              title="Atualizar"
               onClick={() => {
                 queryClient.invalidateQueries({ queryKey: ["records"] });
                 setLastUpdated(new Date());
               }}

            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-muted-foreground">Ordenar por:</span>
          {([
            ["horaInicio", "Hora"],
            ["cia", "CIA"],
            ["cidade", "Cidade"],
            ["modalidade", "Modalidade"],
          ] as const).map(([k, label]) => (
            <button
              key={k}
              onClick={() => toggleSort(k)}
              className={`items-center gap-1 rounded-full border px-2.5 py-1 transition ${
                k === "horaInicio" ? "hidden sm:inline-flex" : "inline-flex"
              } ${
                sortKey === k
                  ? "border-pm-navy bg-pm-navy text-primary-foreground"
                  : "border-border bg-card hover:bg-muted"
              }`}
            >
              {label}
              {sortKey === k && (
                <ArrowUpDown className="h-3 w-3" />
              )}
            </button>
          ))}

        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-muted-foreground">Filtrar por turno:</span>
          {([
            ["matutino", "Matutino"],
            ["vespertino", "Vespertino"],
            ["noturno", "Noturno"],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() =>
                setShiftFilter((current) => (current === key ? null : key))
              }
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 transition ${
                shiftFilter === key
                  ? "border-pm-navy bg-pm-navy text-primary-foreground"
                  : "border-border bg-card hover:bg-muted"
              }`}
            >
              {label}
            </button>
          ))}
          <button
            onClick={() => setShiftFilter(null)}
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 transition ${
              shiftFilter === null
                ? "border-muted-foreground/50 bg-muted text-muted-foreground"
                : "border-border bg-card hover:bg-muted"
            }`}
          >
            Todos
          </button>
        </div>

        {filtered.length === 0 ? (
          <Card className="border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">
            Nenhum registro para hoje.
          </Card>
        ) : (
          <div className="space-y-6">
            {groupedRows.map(([cia, rows]) => (
              <section key={cia}>
                <div className="mb-2 flex items-center gap-2">
                  <h2 className="rounded-md bg-pm-navy px-3 py-1 text-sm font-semibold uppercase tracking-wide text-primary-foreground">
                    {cia}
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    {rows.length} {rows.length === 1 ? "registro" : "registros"}
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <div className="space-y-2">
                  {rows.map((r) => {
                    const mod = (r.modalidade || "").toUpperCase().trim();
                    const isCgp = mod === "CGP" || /^CGP \d+$/.test(mod);
                    const modColor = isCgp
                      ? "#D32F2F"
                      : mod === "DEJEM" || mod === "DEJEM FORUM"
                        ? "#111184"
                        : mod === "DELEGADA"
                          ? "#2E7D32"
                          : mod === "RPM"
                            ? "#83358F"
                            : undefined;
                    return (
                    <div
                      key={r.id}
                      className="group flex overflow-hidden rounded-lg border border-border/60 bg-card shadow-sm transition hover:border-pm-navy/40 hover:shadow-md"
                      style={modColor ? { color: modColor } : undefined}
                    >
                      <div className="flex w-1.5 shrink-0 bg-gradient-to-b from-pm-navy to-pm-navy-strong" />
                      <div className="flex min-w-0 flex-1 flex-col gap-2 px-3 py-2.5 lg:flex-row lg:items-center lg:gap-6">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 lg:contents">
                          <div className="flex items-center gap-3 lg:shrink-0 lg:gap-6">
                            <div className="flex items-center gap-1.5">
                              <Car className="h-4 w-4 shrink-0" style={{ color: modColor || undefined }} />
                              <span className="font-mono text-sm font-semibold text-foreground" style={modColor ? { color: modColor } : undefined}>
                                {r.vtr || "—"}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-[11px] text-muted-foreground md:text-sm" style={modColor ? { color: modColor } : undefined}>
                              <Clock className="h-3 w-3 md:h-4 md:w-4" />
                              {r.horaInicio || "--:--"} <span className="opacity-60">→</span> {r.horaTermino || "--:--"}
                            </div>
                          </div>

                          <div className="flex min-w-0 items-center gap-2 lg:shrink-0 lg:gap-4">
                            <span
                              className="rounded-full bg-muted px-2 py-0.5 text-xs font-bold uppercase text-muted-foreground"
                              style={modColor ? { color: modColor } : undefined}
                            >
                              {r.modalidade || "—"}
                            </span>
                            
                            <span className="truncate text-sm font-medium text-foreground" style={modColor ? { color: modColor } : undefined}>
                              {r.cidade || "—"}
                            </span>
                          </div>
                        </div>


                        <div className="flex min-w-0 items-center gap-2 lg:flex-1">

                          
                          <div className="min-w-0">
                            <div className="text-[9px] uppercase tracking-wide text-muted-foreground">
                              Motorista
                            </div>
                            <div className="truncate text-xs text-foreground/90 md:text-sm" style={modColor ? { color: modColor, fontWeight: 600 } : undefined}>
                              {[r.gradMot, r.nomeMotorista].filter(Boolean).join(" ") || "—"}
                            </div>
                          </div>
                        </div>
                        <div className="flex min-w-0 items-center gap-2 lg:flex-1">
                          
                          <div className="min-w-0">
                            <div className="text-[9px] uppercase tracking-wide text-muted-foreground">
                              Encarregado
                            </div>
                            <div className="truncate text-xs text-foreground/90 md:text-sm" style={modColor ? { color: modColor, fontWeight: 600 } : undefined}>
                              {[r.gradEnc, r.nomeEncarregado].filter(Boolean).join(" ") || "—"}
                            </div>

                          </div>
                        </div>
                        <div className="flex min-w-0 items-center gap-2 lg:flex-1">
                          <div className="min-w-0">
                            <div className="text-[9px] uppercase tracking-wide text-muted-foreground">
                              Auxiliares
                            </div>
                            <div className="truncate text-xs text-foreground/90 md:text-sm" style={modColor ? { color: modColor, fontWeight: 600 } : undefined}>
                              {r.auxiliares || "—"}
                            </div>
                          </div>
                        </div>



                        <div className="order-last flex items-center gap-2 lg:order-none lg:shrink-0">
                          {r.tpd?.toUpperCase() === "SIM" ? (
                            <span className="rounded-full bg-pm-gold px-2 py-0.5 text-[10px] font-bold uppercase text-pm-navy">
                              TPD
                            </span>
                          ) : (
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
                              —
                            </span>
                          )}
                          {(session.group === "Administrador" || 
                            session.group === "Oficiais" || 
                            session.group === "Supervisor" || 
                            r.createdByEmail.trim().toLowerCase() === session.email.trim().toLowerCase()) ? (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                title="Editar registro"
                                className="h-7 w-7 text-pm-navy hover:bg-pm-navy/10"
                                onClick={() => setEditRow(r)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                title="Excluir registro"
                                className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                onClick={() => setConfirmDel(r)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <span
                              title="Você não tem permissão para editar este registro."
                              className="inline-flex h-7 w-7 items-center justify-center text-muted-foreground/60"
                            >
                              <Lock className="h-3.5 w-3.5" />
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}



        <div className="mt-5 flex justify-end">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-pm-navy text-primary-foreground hover:bg-pm-navy-strong">
                <Plus className="mr-1 h-4 w-4" /> Novo Registro
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-2xl md:max-w-4xl max-h-[90vh] overflow-y-auto">

              <DialogHeader>
                <DialogTitle>Novo Registro</DialogTitle>
              </DialogHeader>
              <RecordForm
                onSuccess={(vtr) => {
                  setOpen(false);
                  toast.success(`Mapa Força da VTR ${vtr} inserido com sucesso!`);
                  queryClient.invalidateQueries({ queryKey: ["records"] });
                }}
                defaultDate={activeDate}
              />
            </DialogContent>
          </Dialog>
        </div>

        <Dialog open={!!editRow} onOpenChange={(o) => !o && setEditRow(null)}>
          <DialogContent className="max-w-[95vw] sm:max-w-2xl md:max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Registro</DialogTitle>
            </DialogHeader>
            {editRow && (
              <RecordForm
                initial={editRow}
                defaultDate={editRow.data || today}
                onSuccess={(vtr) => {
                  setEditRow(null);
                  toast.success(`Registro da VTR ${vtr} atualizado com sucesso!`);
                  queryClient.invalidateQueries({ queryKey: ["records"] });
                }}
              />
            )}
          </DialogContent>
        </Dialog>
      </main>

      <AlertDialog
        open={!!confirmDel}
        onOpenChange={(o) => !o && setConfirmDel(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir registro?</AlertDialogTitle>
            <AlertDialogDescription>
              VTR <strong>{confirmDel?.vtr}</strong> · {confirmDel?.cidade}.
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={delMutation.isPending}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={delMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (confirmDel) delMutation.mutate(confirmDel.id);
              }}
            >
              {delMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}


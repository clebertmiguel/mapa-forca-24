import { createFileRoute, useRouter, redirect } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { getSession } from "@/lib/auth.functions";
import { useMemo, useState } from "react";
import { AppNav } from "@/components/AppNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  FileDown,
  FileSpreadsheet,
  Printer,
  RefreshCw,
  CalendarDays,
} from "lucide-react";
import { getRecords } from "@/lib/sheets.functions";
import { gerarRelatorioPdf } from "@/lib/pdf";
import { gerarRelatorioExcel } from "@/lib/excel";
import type { RecordRow } from "@/lib/sheets.server";
import { CIDADE_ORDER } from "@/lib/sheets.server";
import pmLogo from "@/assets/pm-logo.png.asset.json";

const recordsQuery = { queryKey: ["records"], queryFn: () => getRecords() };

const CIA_ORDER = [
  "1ª CIA PM",
  "2ª CIA PM",
  "3ª CIA PM",
  "4ª CIA PM",
  "EM",
] as const;

export const Route = createFileRoute("/relatorio-visualizar")({
  head: () => ({
    meta: [
      { title: "Visualizar Relatório · Mapa Força" },
      {
        name: "description",
        content:
          "Visualização do Relatório Diário do Mapa Força idêntica ao PDF oficial.",
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
  loader: ({ context }) => context.queryClient.ensureQueryData(recordsQuery),
  component: VisualizarRelatorio,
});

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toISODate(v: string): string {
  const s = (v || "").trim();
  if (!s) return "";
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const slash = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (slash) {
    let d = Number(slash[1]);
    let m = Number(slash[2]);
    const y = slash[3];
    if (d <= 12 && m > 12) [d, m] = [m, d];
    return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  return s;
}

function fmtBR(iso: string) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function countPoliciais(r: RecordRow): number {
  let n = 0;
  if (r.nomeEncarregado?.trim()) n++;
  if (r.nomeMotorista?.trim()) n++;
  if (r.auxiliares?.trim())
    n += r.auxiliares.split(/[,;\n]+/).filter((s) => s.trim()).length;
  return n;
}

function compareHora(a: string, b: string): number {
  const normalize = (h: string) => h.replace(/[^0-9]/g, "").padStart(4, "0");
  return normalize(a).localeCompare(normalize(b), undefined, { numeric: true });
}

function cidadeIndex(cidade: string): number {
  const c = (cidade || "").trim().toUpperCase();
  const idx = CIDADE_ORDER.findIndex((x) => x.toUpperCase() === c);
  return idx === -1 ? Number.MAX_SAFE_INTEGER : idx;
}

interface CidadeSubgrupo {
  cidade: string;
  itens: RecordRow[];
  total: number;
}

interface GrupoCIA {
  key: string;
  cidades: CidadeSubgrupo[];
  total: number;
  viaturas: number;
}

function VisualizarRelatorio() {
  const { data: records } = useSuspenseQuery(recordsQuery);
  const queryClient = useQueryClient();
  const router = useRouter();
  const [date, setDate] = useState(todayISO());
  const [refreshing, setRefreshing] = useState(false);

  const filtered = useMemo(
    () => records.filter((r) => toISODate(r.data) === date),
    [records, date],
  );

  const grupos = useMemo(() => {
    const byCia = new Map<string, RecordRow[]>();
    for (const r of filtered) {
      const cia = (r.cia || "").trim();
      const list = byCia.get(cia) ?? [];
      list.push(r);
      byCia.set(cia, list);
    }

    const result: GrupoCIA[] = [];
    for (const key of CIA_ORDER) {
      const rows = byCia.get(key) ?? [];
      if (rows.length === 0) continue;

      const byCity = new Map<string, RecordRow[]>();
      for (const r of rows) {
        const city = (r.cidade || "").trim();
        const list = byCity.get(city) ?? [];
        list.push(r);
        byCity.set(city, list);
      }

      const cidades = Array.from(byCity.entries())
        .map(([cidade, itens]) => {
          const sorted = itens.sort((a, b) => compareHora(a.horaInicio, b.horaInicio));
          return {
            cidade,
            itens: sorted,
            total: sorted.reduce((acc, r) => acc + countPoliciais(r), 0),
          };
        })
        .sort((a, b) => cidadeIndex(a.cidade) - cidadeIndex(b.cidade));

      result.push({
        key,
        cidades,
        total: cidades.reduce((acc, c) => acc + c.total, 0),
        viaturas: rows.length,
      });
    }
    return result;
  }, [filtered]);

  const totalGeral = grupos.reduce((a, g) => a + g.total, 0);
  const totalViaturas = grupos.reduce((a, g) => a + g.viaturas, 0);
  const emissao = new Date().toLocaleString("pt-BR");

  async function atualizar() {
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ["records"] });
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="min-h-screen bg-background print:bg-white">
      <div className="print:hidden">
        <AppNav />
      </div>

      {/* Barra de ações */}
      <div className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-[1100px] flex-wrap items-center gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-9 w-[170px]"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={atualizar}
            disabled={refreshing}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Atualizar
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" /> Imprimir
          </Button>
          <Button
            size="sm"
            onClick={() => gerarRelatorioPdf(filtered, date)}
            disabled={filtered.length === 0}
            className="bg-pm-navy text-primary-foreground hover:bg-pm-navy-strong"
          >
            <FileDown className="mr-2 h-4 w-4" /> Exportar PDF
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => gerarRelatorioExcel(filtered, date)}
            disabled={filtered.length === 0}
            className="border-pm-navy text-pm-navy hover:bg-pm-navy/10"
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Exportar para Excel
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto"
            onClick={() => router.history.back()}
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
          </Button>
        </div>
      </div>

      {/* Folha A4 */}
      <main className="mx-auto max-w-[1100px] px-4 py-6 print:p-0">
        <article
          className="mx-auto bg-white text-[#141414] shadow-md print:shadow-none"
          style={{ width: "min(100%, 794px)", minHeight: "1123px" }}
        >
          {/* Cabeçalho */}
          <header
            className="flex items-center justify-between px-8 py-5 text-white"
            style={{ background: "rgb(34,50,90)" }}
          >
            <div className="flex items-center gap-3">
              <img
                src={pmLogo.url}
                alt="Brasão PM"
                className="h-12 w-12 object-contain"
              />
              <div>
                <h1 className="text-lg font-bold leading-tight">
                  24º BATALHÃO DE POLICIA MILITAR DO INTERIOR
                </h1>
                <p className="text-sm opacity-90">Mapa Força Diário</p>
              </div>
            </div>
            <div className="text-right text-xs leading-relaxed">
              <p>
                Data de referência: <strong>{fmtBR(date)}</strong>
              </p>
              <p>Emitido em: {emissao}</p>
            </div>
          </header>

          <section className="px-8 py-6">
            {grupos.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                Nenhum registro encontrado para a data selecionada.
              </p>
            ) : (
              grupos.map((g) => (
                <div key={g.key} className="mb-6 break-inside-avoid">
                  <div
                    className="flex items-center justify-between rounded-sm px-3 py-2 text-sm font-bold"
                    style={{
                      background: "rgb(230,235,245)",
                      color: "rgb(34,50,90)",
                    }}
                  >
                    <span>{g.key}</span>
                    <span className="text-xs font-semibold">
                      {g.viaturas} viatura(s) · {g.total} policial(is)
                    </span>
                  </div>

                  {g.cidades.map((sub) => (
                    <div key={sub.cidade} className="mb-4 break-inside-avoid">
                      <div
                        className="px-3 py-1.5 text-xs font-bold uppercase tracking-wide"
                        style={{
                          background: "rgb(245,247,250)",
                          color: "rgb(34,50,90)",
                          borderBottom: "2px solid rgb(200,210,225)",
                        }}
                      >
                        {sub.cidade}
                        <span className="ml-2 font-normal normal-case opacity-80">
                          ({sub.itens.length} viatura(s) · {sub.total} policial(is))
                        </span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-[11px]">
                          <thead>
                            <tr style={{ background: "rgb(55,75,120)", color: "#fff" }}>
                              {[
                                "VTR",
                                "Início",
                                "Término",
                                "Modalidade",
                                "Encarregado",
                                "Motorista",
                                "TPD",
                                "Auxiliares",
                              ].map((h) => (
                                <th
                                  key={h}
                                  className="border border-[#cfd6e4] px-2 py-1.5 text-left font-semibold"
                                >
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {sub.itens.map((r, i) => {
                              const mod = (r.modalidade || "").toUpperCase().trim();
                              const isDejem = mod === "DEJEM" || mod === "DEJEM FORUM";
                              const isCgp = mod === "CGP" || /^CGP \d+$/.test(mod);
                              const color = isDejem
                                ? "#111184"
                                : isCgp
                                  ? "#D32F2F"
                                  : mod === "DELEGADA"
                                    ? "#2E7D32"
                                    : mod === "RPM"
                                      ? "#83358F"
                                      : undefined;
                              return (
                                <tr
                                  key={r.id || i}
                                  style={{
                                    background:
                                      i % 2 === 1 ? "rgb(246,248,252)" : "#fff",
                                    color,
                                    fontWeight: color ? 600 : undefined,
                                  }}
                                >
                                  <td className="border border-[#cfd6e4] px-2 py-1.5">
                                    {r.vtr}
                                  </td>
                                  <td className="border border-[#cfd6e4] px-2 py-1.5">
                                    {r.horaInicio}
                                  </td>
                                  <td className="border border-[#cfd6e4] px-2 py-1.5">
                                    {r.horaTermino}
                                  </td>
                                  <td className="border border-[#cfd6e4] px-2 py-1.5">
                                    {r.modalidade}
                                  </td>
                                  <td className="border border-[#cfd6e4] px-2 py-1.5">
                                    {`${r.gradEnc} ${r.nomeEncarregado}`.trim()}
                                  </td>
                                  <td className="border border-[#cfd6e4] px-2 py-1.5">
                                    {`${r.gradMot} ${r.nomeMotorista}`.trim()}
                                  </td>
                                  <td className="border border-[#cfd6e4] px-2 py-1.5 text-center font-semibold">
                                    {r.tpd || "NAO"}
                                  </td>
                                  <td className="border border-[#cfd6e4] px-2 py-1.5">
                                    {r.auxiliares || "—"}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              ))
            )}

            {totalGeral > 0 && (
              <p
                className="mt-6 text-sm font-bold"
                style={{ color: "rgb(34,50,90)" }}
              >
                Total geral de policiais: {totalGeral}   Total de Viaturas: {totalViaturas}
              </p>
            )}
          </section>

          <footer className="border-t px-8 py-4 text-[10px] text-muted-foreground">
            <div className="flex justify-between">
              <span>Mapa Força Diário · Polícia Militar</span>
              <span>Documento gerado eletronicamente</span>
            </div>
          </footer>
        </article>
      </main>

      <style>{`
        @media print {
          @page { size: A4; margin: 12mm; }
          body { background: #fff !important; }
        }
      `}</style>
    </div>
  );
}

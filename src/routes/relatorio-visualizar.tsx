import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
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
  loader: ({ context }) => context.queryClient.ensureQueryData(recordsQuery),
  component: VisualizarRelatorio,
});

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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

function VisualizarRelatorio() {
  const { data: records } = useSuspenseQuery(recordsQuery);
  const queryClient = useQueryClient();
  const router = useRouter();
  const [date, setDate] = useState(todayISO());
  const [refreshing, setRefreshing] = useState(false);

  const filtered = useMemo(
    () => records.filter((r) => r.data === date),
    [records, date],
  );

  const grupos = useMemo(() => {
    return CIA_ORDER.map((key) => {
      const itens = filtered.filter((r) => (r.cia || "").trim() === key);
      const total = itens.reduce((a, r) => a + countPoliciais(r), 0);
      return { key, itens, total };
    }).filter((g) => g.itens.length > 0);
  }, [filtered]);

  const totalGeral = grupos.reduce((a, g) => a + g.total, 0);
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
                      {g.itens.length} viatura(s) · {g.total} policial(is)
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="mt-1 w-full border-collapse text-[11px]">
                      <thead>
                        <tr style={{ background: "rgb(55,75,120)", color: "#fff" }}>
                          {[
                            "Cidade",
                            "Início",
                            "Término",
                            "VTR",
                            "Mod.",
                            "TPD",
                            "Encarregado",
                            "Motorista",
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
                        {g.itens.map((r, i) => {
                          const mod = (r.modalidade || "").toUpperCase().trim();
                          const color =
                            mod === "CGP"
                              ? "#D32F2F"
                              : mod === "DEJEM"
                                ? "#3FA9F5"
                                : mod === "DELEGADA"
                                  ? "#2E7D32"
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
                              {r.cidade}
                            </td>
                            <td className="border border-[#cfd6e4] px-2 py-1.5">
                              {r.horaInicio}
                            </td>
                            <td className="border border-[#cfd6e4] px-2 py-1.5">
                              {r.horaTermino}
                            </td>
                            <td className="border border-[#cfd6e4] px-2 py-1.5">
                              {r.vtr}
                            </td>
                            <td className="border border-[#cfd6e4] px-2 py-1.5">
                              {r.modalidade}
                            </td>
                            <td className="border border-[#cfd6e4] px-2 py-1.5 text-center font-semibold">
                              {r.tpd || "NAO"}
                            </td>
                            <td className="border border-[#cfd6e4] px-2 py-1.5">
                              {`${r.gradEnc} ${r.nomeEncarregado}`.trim()}
                            </td>
                            <td className="border border-[#cfd6e4] px-2 py-1.5">
                              {`${r.gradMot} ${r.nomeMotorista}`.trim()}
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
              ))
            )}

            {totalGeral > 0 && (
              <p
                className="mt-6 text-sm font-bold"
                style={{ color: "rgb(34,50,90)" }}
              >
                Total geral de policiais: {totalGeral}   Total de Viaturas: {filtered.length}
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

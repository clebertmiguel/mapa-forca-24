/**
 * Geração de PDF do Mapa Força.
 * Replica a tabulação da tela /relatorio-visualizar: agrupa por CIA
 * (ordem oficial), depois por cidade (ordem fixa) e, dentro de cada
 * cidade, classifica por hora inicial crescente.
 */
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { CIDADE_ORDER, type RecordRow } from "./sheets.server";

const CIA_ORDER = [
  "1ª CIA PM",
  "2ª CIA PM",
  "3ª CIA PM",
  "4ª CIA PM",
  "EM",
] as const;

function countPoliciais(r: RecordRow): number {
  let n = 0;
  if (r.nomeEncarregado?.trim()) n++;
  if (r.nomeMotorista?.trim()) n++;
  if (r.auxiliares?.trim()) {
    n += r.auxiliares.split(/[,;\n]+/).filter((s) => s.trim()).length;
  }
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

function fmtBR(isoDate: string): string {
  if (!isoDate) return "";
  const [y, m, d] = isoDate.split("-");
  if (!y || !m || !d) return isoDate;
  return `${d}/${m}/${y}`;
}

function modTextColor(mod: string): [number, number, number] | null {
  const m = (mod || "").toUpperCase().trim();
  if (m === "DEJEM" || m === "DEJEM FORUM") return [17, 17, 132]; // #111184
  if (m === "CGP" || /^CGP \d+$/.test(m)) return [211, 47, 47];
  if (m === "DELEGADA") return [46, 125, 50];
  if (m === "RPM") return [131, 53, 143]; // #83358F
  return null;
}

export function gerarRelatorioPdf(
  registros: RecordRow[],
  dataRef: string,
): void {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 36;

  // Cabeçalho institucional
  doc.setFillColor(34, 50, 90);
  doc.rect(0, 0, pageW, 64, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("24º BATALHÃO DE POLICIA MILITAR DO INTERIOR", margin, 26);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Mapa Força Diário", margin, 44);
  doc.setFontSize(9);
  const emissao = new Date().toLocaleString("pt-BR");
  doc.text(`Data de referência: ${fmtBR(dataRef)}`, pageW - margin, 26, {
    align: "right",
  });
  doc.text(`Emitido em: ${emissao}`, pageW - margin, 44, { align: "right" });
  doc.setTextColor(20, 20, 20);

  let cursorY = 88;
  let totalGeral = 0;
  let totalViaturas = 0;

  let primeiroBloco = true;

  for (const cia of CIA_ORDER) {
    const rows = registros.filter((r) => (r.cia || "").trim() === cia);
    if (rows.length === 0) continue;

    // Quebra de página: cada bloco de CIA começa em uma nova página
    if (!primeiroBloco) {
      doc.addPage();
      cursorY = 60;
    }
    primeiroBloco = false;


    // Agrupa por cidade dentro da CIA
    const byCity = new Map<string, RecordRow[]>();
    for (const r of rows) {
      const city = (r.cidade || "").trim();
      const list = byCity.get(city) ?? [];
      list.push(r);
      byCity.set(city, list);
    }
    const cidades = Array.from(byCity.entries())
      .map(([cidade, itens]) => ({
        cidade,
        itens: itens.sort((a, b) => compareHora(a.horaInicio, b.horaInicio)),
      }))
      .sort((a, b) => cidadeIndex(a.cidade) - cidadeIndex(b.cidade));

    const totalCia = rows.reduce((acc, r) => acc + countPoliciais(r), 0);
    totalGeral += totalCia;
    totalViaturas += rows.length;

    if (cursorY > 700) {
      doc.addPage();
      cursorY = 60;
    }

    // Faixa de título da CIA
    doc.setFillColor(230, 235, 245);
    doc.rect(margin, cursorY - 14, pageW - margin * 2, 22, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(34, 50, 90);
    doc.text(cia, margin + 8, cursorY);
    doc.text(
      `${rows.length} viatura(s) · ${totalCia} policial(is)`,
      pageW - margin - 8,
      cursorY,
      { align: "right" },
    );
    cursorY += 14;
    doc.setTextColor(20, 20, 20);

    // Subgrupos por cidade
    for (const { cidade, itens } of cidades) {
      const totalCidade = itens.reduce(
        (acc, r) => acc + countPoliciais(r),
        0,
      );

      if (cursorY > 720) {
        doc.addPage();
        cursorY = 60;
      }

      // Faixa de título da cidade
      doc.setFillColor(245, 247, 250);
      doc.rect(margin, cursorY - 11, pageW - margin * 2, 17, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(34, 50, 90);
      doc.text(cidade.toUpperCase(), margin + 8, cursorY + 1);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(
        `${itens.length} viatura(s) · ${totalCidade} policial(is)`,
        pageW - margin - 8,
        cursorY + 1,
        { align: "right" },
      );
      cursorY += 12;
      doc.setTextColor(20, 20, 20);

      autoTable(doc, {
        startY: cursorY,
        head: [
          [
            "VTR",
            "Início",
            "Término",
            "Modalidade",
            "Encarregado",
            "Motorista",
            "TPD",
            "Auxiliares",
          ],
        ],
        body: itens.map((r) => [
          r.vtr,
          r.horaInicio,
          r.horaTermino,
          r.modalidade,
          `${r.gradEnc} ${r.nomeEncarregado}`.trim(),
          `${r.gradMot} ${r.nomeMotorista}`.trim(),
          r.tpd || "NAO",
          r.auxiliares || "—",
        ]),
        styles: { fontSize: 8, cellPadding: 4 },
        headStyles: { fillColor: [55, 75, 120], textColor: 255 },
        alternateRowStyles: { fillColor: [246, 248, 252] },
        margin: { left: margin, right: margin },
        theme: "grid",
        didParseCell: (data) => {
          if (data.section !== "body") return;
          const color = modTextColor(itens[data.row.index]?.modalidade ?? "");
          if (color) {
            data.cell.styles.textColor = color;
            data.cell.styles.fontStyle = "bold";
          }
        },
      });
      // @ts-expect-error autoTable injeta lastAutoTable em runtime
      cursorY = (doc.lastAutoTable?.finalY ?? cursorY) + 16;
    }

    cursorY += 8;
  }

  if (totalGeral === 0) {
    doc.setFontSize(11);
    doc.text(
      "Nenhum registro encontrado para a data selecionada.",
      margin,
      cursorY,
    );
  } else {
    if (cursorY > 760) {
      doc.addPage();
      cursorY = 60;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(34, 50, 90);
    doc.text(
      `Total geral de policiais: ${totalGeral}   Total de Viaturas: ${totalViaturas}`,
      margin,
      cursorY,
    );
  }

  // Numeração de páginas
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(
      `Página ${i} de ${pageCount}`,
      pageW - margin,
      doc.internal.pageSize.getHeight() - 16,
      { align: "right" },
    );
  }

  doc.save(`mapa-forca-${dataRef}.pdf`);
}

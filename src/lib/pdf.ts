/**
 * Geração de PDF do Mapa Força.
 * Agrupa por companhia respeitando a ordem oficial e produz layout A4
 * profissional com cabeçalhos, totais e numeração de páginas.
 */
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { RecordRow } from "./sheets.server";

const CIA_ORDER: Array<{ key: string; label: string }> = [
  { key: "1ª CIA PM", label: "1ª CIA PM" },
  { key: "2ª CIA PM", label: "2ª CIA PM" },
  { key: "3ª CIA PM", label: "3ª CIA PM" },
  { key: "4ª CIA PM", label: "4ª CIA PM" },
  { key: "EM", label: "EM" },
];

function countPoliciais(r: RecordRow): number {
  let n = 0;
  if (r.nomeEncarregado?.trim()) n++;
  if (r.nomeMotorista?.trim()) n++;
  if (r.auxiliares?.trim()) {
    n += r.auxiliares.split(/[,;\n]+/).filter((s) => s.trim()).length;
  }
  return n;
}

function fmtBR(isoDate: string): string {
  if (!isoDate) return "";
  const [y, m, d] = isoDate.split("-");
  if (!y || !m || !d) return isoDate;
  return `${d}/${m}/${y}`;
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

  CIA_ORDER.forEach((cia) => {
    const itens = registros.filter((r) => (r.cia || "").trim() === cia.key);
    if (itens.length === 0) return;

    const totalCia = itens.reduce((acc, r) => acc + countPoliciais(r), 0);
    totalGeral += totalCia;

    if (cursorY > 720) {
      doc.addPage();
      cursorY = 60;
    }

    doc.setFillColor(230, 235, 245);
    doc.rect(margin, cursorY - 14, pageW - margin * 2, 22, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(34, 50, 90);
    doc.text(cia.label, margin + 8, cursorY);
    doc.text(
      `${itens.length} viatura(s) · ${totalCia} policial(is)`,
      pageW - margin - 8,
      cursorY,
      { align: "right" },
    );
    cursorY += 14;
    doc.setTextColor(20, 20, 20);

    autoTable(doc, {
      startY: cursorY,
      head: [
        [
          "Cidade",
          "Início",
          "Término",
          "VTR",
          "Mod.",
          "TPD",
          "Encarregado",
          "Motorista",
          "Auxiliares",
        ],
      ],
      body: itens.map((r) => [
        r.cidade,
        r.horaInicio,
        r.horaTermino,
        r.vtr,
        r.modalidade,
        r.tpd || "NAO",
        `${r.gradEnc} ${r.nomeEncarregado}`.trim(),
        `${r.gradMot} ${r.nomeMotorista}`.trim(),
        r.auxiliares || "—",
      ]),
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [55, 75, 120], textColor: 255 },
      alternateRowStyles: { fillColor: [246, 248, 252] },
      margin: { left: margin, right: margin },
      theme: "grid",
      didParseCell: (data) => {
        if (data.section !== "body") return;
        const mod = (itens[data.row.index]?.modalidade || "")
          .toUpperCase()
          .trim();
        if (mod === "CGP") data.cell.styles.textColor = [211, 47, 47];
        else if (mod === "DEJEM") data.cell.styles.textColor = [63, 169, 245];
        else if (mod === "DELEGADA")
          data.cell.styles.textColor = [46, 125, 50];
      },
    });
    // @ts-expect-error autoTable injeta lastAutoTable em runtime
    cursorY = (doc.lastAutoTable?.finalY ?? cursorY) + 24;
  });

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
    doc.text(`Total geral de policiais: ${totalGeral}   Total de Viaturas: ${registros.length}`, margin, cursorY);
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

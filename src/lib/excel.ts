/**
 * Geração de Excel (.xlsx) do Mapa Força.
 * Reproduz a mesma estrutura do relatório PDF/visual, com cabeçalho
 * institucional, agrupamento por CIA, totais e formatação profissional.
 */
import ExcelJS from "exceljs";
import type { RecordRow } from "./sheets.server";

const CIA_ORDER: Array<{ key: string; label: string }> = [
  { key: "1ª CIA PM", label: "1ª CIA PM" },
  { key: "2ª CIA PM", label: "2ª CIA PM" },
  { key: "3ª CIA PM", label: "3ª CIA PM" },
  { key: "4ª CIA PM", label: "4ª CIA PM" },
  { key: "EM", label: "EM" },
];

const HEADERS = [
  "Cidade",
  "Início",
  "Término",
  "VTR",
  "Mod.",
  "TPD",
  "Encarregado",
  "Motorista",
  "Auxiliares",
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

function fmtBR(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

const NAVY = "FF22325A";
const NAVY_SOFT = "FFE6EBF5";
const HEAD_BG = "FF374B78";
const ZEBRA = "FFF6F8FC";
const BORDER = "FFCFD6E4";

const thinBorder = {
  top: { style: "thin" as const, color: { argb: BORDER } },
  left: { style: "thin" as const, color: { argb: BORDER } },
  bottom: { style: "thin" as const, color: { argb: BORDER } },
  right: { style: "thin" as const, color: { argb: BORDER } },
};

export async function gerarRelatorioExcel(
  registros: RecordRow[],
  dataRef: string,
): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Mapa Força Diário";
  wb.created = new Date();

  const ws = wb.addWorksheet("Mapa Força", {
    pageSetup: {
      paperSize: 9,
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: {
        left: 0.4,
        right: 0.4,
        top: 0.5,
        bottom: 0.5,
        header: 0.3,
        footer: 0.3,
      },
    },
    views: [{ showGridLines: false }],
  });

  const COLS = HEADERS.length; // 8

  // ── Cabeçalho institucional ────────────────────────────────────────────
  ws.mergeCells(1, 1, 1, COLS);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = "24º BATALHÃO DE POLICIA MILITAR DO INTERIOR";
  titleCell.font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
  titleCell.alignment = { vertical: "middle", horizontal: "center" };
  titleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: NAVY },
  };
  ws.getRow(1).height = 26;

  ws.mergeCells(2, 1, 2, COLS);
  const subCell = ws.getCell(2, 1);
  subCell.value = "Mapa Força Diário";
  subCell.font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
  subCell.alignment = { vertical: "middle", horizontal: "center" };
  subCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: NAVY },
  };
  ws.getRow(2).height = 18;

  const emissao = new Date().toLocaleString("pt-BR");
  ws.mergeCells(3, 1, 3, Math.ceil(COLS / 2));
  const dataCell = ws.getCell(3, 1);
  dataCell.value = `Data de referência: ${fmtBR(dataRef)}`;
  dataCell.font = { bold: true, size: 10 };
  dataCell.alignment = { vertical: "middle", horizontal: "left" };

  ws.mergeCells(3, Math.ceil(COLS / 2) + 1, 3, COLS);
  const emiCell = ws.getCell(3, Math.ceil(COLS / 2) + 1);
  emiCell.value = `Emitido em: ${emissao}`;
  emiCell.font = { size: 10, color: { argb: "FF555555" } };
  emiCell.alignment = { vertical: "middle", horizontal: "right" };

  let row = 5;
  let totalGeral = 0;

  // ── Grupos por CIA ─────────────────────────────────────────────────────
  CIA_ORDER.forEach((cia) => {
    const itens = registros.filter((r) => (r.cia || "").trim() === cia.key);
    if (itens.length === 0) return;

    const totalCia = itens.reduce((acc, r) => acc + countPoliciais(r), 0);
    totalGeral += totalCia;

    // Faixa do grupo (CIA)
    ws.mergeCells(row, 1, row, COLS - 2);
    const ciaCell = ws.getCell(row, 1);
    ciaCell.value = cia.label;
    ciaCell.font = { bold: true, size: 11, color: { argb: NAVY } };
    ciaCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: NAVY_SOFT },
    };
    ciaCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };

    ws.mergeCells(row, COLS - 1, row, COLS);
    const totCell = ws.getCell(row, COLS - 1);
    totCell.value = `${itens.length} viatura(s) · ${totalCia} policial(is)`;
    totCell.font = { bold: true, size: 10, color: { argb: NAVY } };
    totCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: NAVY_SOFT },
    };
    totCell.alignment = { vertical: "middle", horizontal: "right" };
    ws.getRow(row).height = 20;
    row++;

    // Cabeçalho da tabela
    const headRow = ws.getRow(row);
    HEADERS.forEach((h, i) => {
      const c = headRow.getCell(i + 1);
      c.value = h;
      c.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
      c.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: HEAD_BG },
      };
      c.alignment = {
        vertical: "middle",
        horizontal: "left",
        wrapText: true,
      };
      c.border = thinBorder;
    });
    headRow.height = 20;
    row++;

    // Linhas
    itens.forEach((r, i) => {
      const tr = ws.getRow(row);
      const values = [
        r.cidade || "",
        r.horaInicio || "",
        r.horaTermino || "",
        r.vtr || "",
        r.modalidade || "",
        r.tpd || "NAO",
        `${r.gradEnc || ""} ${r.nomeEncarregado || ""}`.trim(),
        `${r.gradMot || ""} ${r.nomeMotorista || ""}`.trim(),
        r.auxiliares || "—",
      ];
      const mod = (r.modalidade || "").toUpperCase().trim();
      const isCgp = mod === "CGP" || /^CGP \d+$/.test(mod);
      const modColor = isCgp
        ? "FFD32F2F"
        : mod === "DEJEM" || mod === "DEJEM FORUM"
          ? "FF111184"
          : mod === "DELEGADA"
            ? "FF2E7D32"
            : mod === "RPM"
              ? "FF83358F"
              : undefined;
      values.forEach((v, j) => {
        const c = tr.getCell(j + 1);
        c.value = v;
        c.font = modColor
          ? { size: 10, bold: true, color: { argb: modColor } }
          : { size: 10 };
        c.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
        c.border = thinBorder;
        if (i % 2 === 1) {
          c.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: ZEBRA },
          };
        }
      });
      row++;
    });

    row++; // espaçamento entre grupos
  });

  // ── Totais finais ──────────────────────────────────────────────────────
  if (totalGeral === 0) {
    ws.mergeCells(row, 1, row, COLS);
    const c = ws.getCell(row, 1);
    c.value = "Nenhum registro encontrado para a data selecionada.";
    c.font = { italic: true, size: 11, color: { argb: "FF666666" } };
    c.alignment = { vertical: "middle", horizontal: "center" };
    row++;
  } else {
    ws.mergeCells(row, 1, row, COLS);
    const c = ws.getCell(row, 1);
    c.value = `Total geral de policiais: ${totalGeral}     Total de Viaturas: ${registros.length}`;
    c.font = { bold: true, size: 12, color: { argb: NAVY } };
    c.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    ws.getRow(row).height = 22;
    row += 2;
  }

  // Rodapé
  ws.mergeCells(row, 1, row, COLS);
  const footer = ws.getCell(row, 1);
  footer.value =
    "Mapa Força Diário · 24º BPM/I — Documento gerado eletronicamente";
  footer.font = { italic: true, size: 9, color: { argb: "FF888888" } };
  footer.alignment = { vertical: "middle", horizontal: "center" };

  // Largura das colunas (aproxima AutoFit)
  const widths = [16, 9, 9, 10, 14, 6, 28, 28, 40];
  widths.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });

  // Repetir linhas de cabeçalho na impressão
  ws.pageSetup.printTitlesRow = "1:3";

  // ── Download ───────────────────────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Relatorio_Mapa_Forca_${fmtBR(dataRef).replaceAll("/", "-")}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Server-only helpers para chamar a API do Google Sheets via Lovable Gateway.
 * Toda persistência da aplicação ocorre nesta planilha.
 */
const SPREADSHEET_ID = "1SwrfUR0WYhIgHjxO0lFEtdaIy6rFjQ3U2kh6jYEGgD8";
const GATEWAY = "https://connector-gateway.lovable.dev/google_sheets/v4";
const SHEET_RECORDS = "Página1";

export const HEADERS = [
  "id",
  "cia",
  "cidade",
  "data",
  "horaInicio",
  "horaTermino",
  "vtr",
  "modalidade",
  "gradEnc",
  "nomeEncarregado",
  "gradMot",
  "nomeMotorista",
  "auxiliares",
  "criadoEM",
  "tpd",
  "createdByDevice",
  "updatedAt",
] as const;


export type FieldKey = (typeof HEADERS)[number];
export type RecordRow = Record<FieldKey, string>;

function authHeaders() {
  const lovable = process.env.LOVABLE_API_KEY;
  const conn = process.env.GOOGLE_SHEETS_API_KEY;
  if (!lovable || !conn) {
    throw new Error("Credenciais do Google Sheets ausentes no servidor.");
  }
  return {
    Authorization: `Bearer ${lovable}`,
    "X-Connection-Api-Key": conn,
    "Content-Type": "application/json",
  };
}

async function gatewayFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${GATEWAY}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...(init?.headers || {}) },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Google Sheets ${res.status}: ${body.slice(0, 300)}`);
  }
  return res.json();
}

async function readRange(range: string): Promise<string[][]> {
  const data = await gatewayFetch(
    `/spreadsheets/${SPREADSHEET_ID}/values/${range}`,
  );
  return (data.values as string[][]) ?? [];
}

export async function fetchAllRecords(): Promise<RecordRow[]> {
  const rows = await readRange(`${SHEET_RECORDS}!A2:Q`);
  return rows
    .filter((r) => r.length > 0)
    .map((r) => {
      const obj = {} as RecordRow;
      HEADERS.forEach((h, i) => {
        obj[h] = (r[i] ?? "").toString();
      });
      return obj;
    });
}


async function readSingleColumn(
  sheet: string,
  startRow = 2,
): Promise<string[]> {
  try {
    const rows = await readRange(`${sheet}!A${startRow}:A`);
    return rows
      .map((r) => (r[0] ?? "").toString().trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

async function readPairColumns(
  sheet: string,
  startRow = 2,
): Promise<Array<[string, string]>> {
  try {
    const rows = await readRange(`${sheet}!A${startRow}:B`);
    return rows
      .map((r) => [
        (r[0] ?? "").toString().trim(),
        (r[1] ?? "").toString().trim(),
      ] as [string, string])
      .filter(([a]) => Boolean(a));
  } catch {
    return [];
  }
}

export interface CidadeEntry {
  cidade: string;
  cia: string;
}

export interface Lookups {
  graduacoes: string[];
  cias: string[];
  cidades: string[];
  cidadeEntries: CidadeEntry[];
  viaturas: string[];
  modalidades: string[];
  cidadeToCia: Record<string, string>;
}

const uniqSorted = (arr: string[]) =>
  Array.from(new Set(arr.map((s) => s.trim()).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, "pt-BR"),
  );

export const CIA_ORDER = ["1ª CIA PM", "2ª CIA PM", "3ª CIA PM", "4ª CIA PM", "EM"];

export async function fetchLookups(): Promise<Lookups> {
  const [vtr, mod, grad, cia, cidPairs, all] = await Promise.all([
    readSingleColumn("VTR"),
    readSingleColumn("MODALIDADE"),
    readSingleColumn("Grad", 1),
    readSingleColumn("CIA"),
    readPairColumns("cidades", 1),
    fetchAllRecords(),
  ]);

  // Pula linha de cabeçalho se A1 não corresponder a uma cidade real
  const cidPairsClean = cidPairs.filter(
    ([a]) => a.toUpperCase() !== "CIDADES",
  );

  // Mantém todas as entradas (cidade + cia) na ordem da planilha,
  // deduplicando pelo par cidade|cia para preservar duplicidades de cidade
  // com CIAs diferentes (ex: SJBVISTA em 1ª CIA, EM e CIA-FT).
  const seenPair = new Set<string>();
  const cidadeEntries: CidadeEntry[] = [];
  const cidadeToCia: Record<string, string> = {};
  for (const [city, ciaName] of cidPairsClean) {
    const key = `${city}|${ciaName}`;
    if (seenPair.has(key)) continue;
    seenPair.add(key);
    cidadeEntries.push({ cidade: city, cia: ciaName });
    // Primeira ocorrência define o mapeamento padrão cidade->cia
    if (!cidadeToCia[city] && ciaName) cidadeToCia[city] = ciaName;
  }

  const graduacoes = grad.length
    ? Array.from(new Set(grad.map((s) => s.trim()).filter(Boolean)))
    : uniqSorted(all.flatMap((r) => [r.gradEnc, r.gradMot]));
  const ciasFromData = uniqSorted(cia.length ? cia : all.map((r) => r.cia));
  const ciasFromMap = uniqSorted(cidadeEntries.map((e) => e.cia));
  const ciasRaw = uniqSorted([...ciasFromData, ...ciasFromMap, ...CIA_ORDER]);
  const cias = [
    ...CIA_ORDER.filter((c) => ciasRaw.includes(c)),
    ...ciasRaw.filter((c) => !CIA_ORDER.includes(c)),
  ];

  const cidades = Array.from(new Set(cidadeEntries.map((e) => e.cidade)));

  return {
    graduacoes,
    cias: cias.length ? cias : CIA_ORDER,
    cidades,
    cidadeEntries,
    viaturas: uniqSorted(vtr),
    modalidades: uniqSorted(mod),
    cidadeToCia,
  };
}



export async function appendRecord(row: RecordRow): Promise<void> {
  const values = [HEADERS.map((h) => row[h] ?? "")];
  await gatewayFetch(
    `/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_RECORDS}!A:Q:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: "POST",
      body: JSON.stringify({ values }),
    },
  );
}

/** Localiza a linha pelo id e limpa os valores (mantém posição mas zera conteúdo). */
export async function deleteRecordById(id: string): Promise<boolean> {
  const all = await fetchAllRecords();
  const idx = all.findIndex((r) => r.id === id);
  if (idx === -1) return false;
  const sheetRow = idx + 2; // +1 cabeçalho, +1 base 1
  await gatewayFetch(
    `/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_RECORDS}!A${sheetRow}:Q${sheetRow}:clear`,
    { method: "POST", body: "{}" },
  );
  return true;
}

export async function findRecordById(id: string): Promise<RecordRow | undefined> {
  const all = await fetchAllRecords();
  return all.find((r) => r.id === id);
}

export async function updateRecordById(id: string, row: RecordRow): Promise<boolean> {
  const all = await fetchAllRecords();
  const idx = all.findIndex((r) => r.id === id);
  if (idx === -1) return false;
  const sheetRow = idx + 2;
  const values = [HEADERS.map((h) => row[h] ?? "")];
  await gatewayFetch(
    `/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_RECORDS}!A${sheetRow}:Q${sheetRow}?valueInputOption=USER_ENTERED`,
    { method: "PUT", body: JSON.stringify({ values }) },
  );
  return true;
}


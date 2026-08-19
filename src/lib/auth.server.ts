/**
 * Server-only helpers para gerenciar usuários na planilha Google Sheets.
 */
import { gatewayFetch, SPREADSHEET_ID, readRange } from "./sheets.server";

const SHEET_USERS = "USUARIOS";

export const USER_HEADERS = [
  "id",
  "nome",
  "re",
  "email",
  "telefone",
  "senha",
  "grupo",
  "ativo",
] as const;

export type UserGroup = "Administrador" | "Oficiais" | "Supervisor" | "Usuario";

export interface UserRow {
  id: string;
  nome: string;
  re: string;
  email: string;
  telefone: string;
  senha?: string;
  grupo: UserGroup;
  ativo: "SIM" | "NAO";
}

export async function fetchAllUsers(): Promise<UserRow[]> {
  try {
    const rows = await readRange(`${SHEET_USERS}!A2:H`);
    return rows
      .filter((r) => r.length > 0)
      .map((r) => {
        const obj = {} as UserRow;
        USER_HEADERS.forEach((h, i) => {
          (obj as any)[h] = (r[i] ?? "").toString();
        });
        return obj;
      });
  } catch (e) {
    console.error("Erro ao buscar usuários:", e);
    return [];
  }
}

export async function findUserByEmail(email: string): Promise<UserRow | undefined> {
  const all = await fetchAllUsers();
  return all.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

export async function appendUser(user: UserRow): Promise<void> {
  const values = [USER_HEADERS.map((h) => (user as any)[h] ?? "")];
  await gatewayFetch(
    `/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_USERS}!A:H:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: "POST",
      body: JSON.stringify({ values }),
    },
  );
}

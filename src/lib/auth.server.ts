/**
 * Server-only helpers para gerenciar usuários na planilha Google Sheets.
 */
import { gatewayFetch, SPREADSHEET_ID, readRange } from "./sheets.server";

const SHEET_USERS = "Users";

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
    const rows = await readRange(`${SHEET_USERS}!A2:H1000`);
    return rows
      .filter((r) => r.length > 0 && (r[3] ?? "").toString().trim() !== "")
      .map((r) => {
        const obj = {} as UserRow;
        USER_HEADERS.forEach((h, i) => {
          (obj as any)[h] = (r[i] ?? "").toString().trim();
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
  const target = email.trim().toLowerCase();
  return all.find((u) => u.email.toLowerCase() === target);
}

export async function appendUser(user: UserRow): Promise<void> {
  const values = [USER_HEADERS.map((h) => (user as any)[h] ?? "")];
  // Usando um range que a API parece aceitar melhor para append: apenas o nome da aba
  await gatewayFetch(
    `/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_USERS}!A2:H:append?valueInputOption=USER_ENTERED`,
    {
      method: "POST",
      body: JSON.stringify({ values }),
    },
  );
}

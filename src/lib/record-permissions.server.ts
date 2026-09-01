import { getCookie } from "@tanstack/react-start/server";
import { findUserByEmail, type UserRow } from "./auth.server";
import type { RecordRow } from "./sheets.server";

interface StoredSession {
  userId?: string;
  email?: string;
}

export async function requireRecordPermission(record: RecordRow): Promise<UserRow> {
  const cookie = getCookie("app_session");
  if (!cookie) throw new Error("Sessão expirada. Entre novamente.");

  let stored: StoredSession;
  try {
    stored = JSON.parse(cookie) as StoredSession;
  } catch {
    throw new Error("Sessão inválida. Entre novamente.");
  }

  if (!stored.email || !stored.userId) {
    throw new Error("Sessão inválida. Entre novamente.");
  }

  const user = await findUserByEmail(stored.email);
  if (!user || user.id !== stored.userId || user.ativo !== "SIM") {
    throw new Error("Usuário sem acesso ativo.");
  }

  const norm = (v?: string) => (v ?? "").trim().toLowerCase();

  if (user.grupo === "Supervisor") {
    const userCia = norm(user.cia);
    const recCia = norm(record.cia);
    if (!userCia || !recCia || userCia !== recCia) {
      throw new Error(
        "Você não possui permissão para alterar ou excluir registros de outra CIA.",
      );
    }
    return user;
  }

  const elevatedGroups = new Set(["Administrador", "Oficiais"]);
  const ownsRecord = norm(record.createdByEmail) === norm(user.email);

  if (!elevatedGroups.has(user.grupo) && !ownsRecord) {
    throw new Error("Você não tem permissão para alterar este registro.");
  }

  return user;
}

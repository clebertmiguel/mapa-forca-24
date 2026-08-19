import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { findUserByEmail, appendUser, type UserRow, type UserGroup } from "./auth.server";
import { setCookie, getCookie, deleteCookie } from "vinxi/http";

const SESSION_COOKIE = "app_session";

export interface SessionData {
  userId: string;
  email: string;
  name: string;
  group: UserGroup;
}

export const login = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z.object({ email: z.string().email(), password: z.string() }).parse(data),
  )
  .handler(async ({ data }) => {
    const user = await findUserByEmail(data.email);
    if (!user) throw new Error("Usuário não encontrado.");
    if (user.ativo !== "SIM") throw new Error("Usuário inativo.");
    if (user.senha !== data.password) throw new Error("Senha incorreta.");

    const session: SessionData = {
      userId: user.id,
      email: user.email,
      name: user.nome,
      group: user.grupo,
    };

    // Usando cookie simples para sessão (em prod deve ser assinado/JWT)
    setCookie(SESSION_COOKIE, JSON.stringify(session), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 1 semana
    });

    return session;
  });

export const logout = createServerFn({ method: "POST" }).handler(async () => {
  deleteCookie(SESSION_COOKIE);
  return { ok: true };
});

export const getSession = createServerFn({ method: "GET" }).handler(async () => {
  const cookie = getCookie(SESSION_COOKIE);
  if (!cookie) return null;
  try {
    return JSON.parse(cookie) as SessionData;
  } catch {
    return null;
  }
});

export const registerUser = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z.object({
      nome: z.string().min(2),
      re: z.string().min(1),
      email: z.string().email(),
      telefone: z.string(),
      senha: z.string().min(4),
    }).parse(data),
  )
  .handler(async ({ data }) => {
    const existing = await findUserByEmail(data.email);
    if (existing) throw new Error("E-mail já cadastrado.");

    const newUser: UserRow = {
      id: crypto.randomUUID(),
      nome: data.nome,
      re: data.re,
      email: data.email,
      telefone: data.telefone,
      senha: data.senha,
      grupo: "Usuario",
      ativo: "SIM",
    };

    await appendUser(newUser);
    return { ok: true };
  });

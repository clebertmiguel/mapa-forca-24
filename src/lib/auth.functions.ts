import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { findUserByEmail, appendUser, type UserRow, type UserGroup } from "./auth.server";
import { setCookie, getCookie, deleteCookie } from "@tanstack/react-start/server";
import bcrypt from "bcryptjs";

const SESSION_COOKIE = "app_session";

export interface SessionData {
  userId: string;
  email: string;
  name: string;
  group: UserGroup;
  cia?: string;
}


export const login = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z.object({ email: z.string().email(), password: z.string() }).parse(data),
  )
  .handler(async ({ data }) => {
    const user = await findUserByEmail(data.email);
    if (!user) return { error: "USER_NOT_FOUND" as const };
    if (user.ativo !== "SIM") return { error: "USER_INACTIVE" as const };

    // Verifica senha criptografada (ou texto plano se for usuário legado/seed manual)
    const isMatch = user.senha?.startsWith("$2a$") || user.senha?.startsWith("$2b$")
      ? await bcrypt.compare(data.password, user.senha)
      : user.senha === data.password;

    if (!isMatch) return { error: "WRONG_PASSWORD" as const };

    const session: SessionData = {
      userId: user.id,
      email: user.email,
      name: user.nome,
      group: user.grupo,
      cia: (user.cia ?? "").trim(),
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

    const hashedEmail = data.email.toLowerCase().trim();
    const hashedPassword = await bcrypt.hash(data.senha, 10);

    const newUser: UserRow = {
      id: crypto.randomUUID(),
      nome: data.nome,
      re: data.re,
      email: hashedEmail,
      telefone: data.telefone,
      senha: hashedPassword,
      grupo: "Usuario",
      ativo: "SIM",
    };

    await appendUser(newUser);

    // Enviar notificação assíncrona para o admin (fire-and-forget)
    try {
      const { sendNewUserAdminNotification } = await import("./notifications.server");
      // Não damos await aqui para não travar o cadastro se o e-mail demorar
      sendNewUserAdminNotification({
        nome: newUser.nome,
        email: newUser.email,
        re: newUser.re,
        grupo: newUser.grupo,
      }).catch(err => console.error("Falha silenciosa na notificação:", err));
    } catch (err) {
      console.error("Erro ao carregar módulo de notificação:", err);
    }

    return { ok: true };

  });

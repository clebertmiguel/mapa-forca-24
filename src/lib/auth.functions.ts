import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { findUserByEmail, findUserByRE, appendUser, fetchAllUsers, updateUser, deleteUser, type UserRow, type UserGroup } from "./auth.server";
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
    if (!user) throw new Error("Usuário não encontrado.");
    if (user.ativo !== "SIM") throw new Error("Usuário inativo.");
    
    // Verifica senha criptografada (ou texto plano se for usuário legado/seed manual)
    const isMatch = user.senha?.startsWith("$2a$") || user.senha?.startsWith("$2b$")
      ? await bcrypt.compare(data.password, user.senha)
      : user.senha === data.password;

    if (!isMatch) throw new Error("Senha incorreta.");

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
      nomeGuerra: z.string().min(2),
      re: z.string().min(1),
      email: z.string().email(),
      telefone: z.string(),
      senha: z.string().min(4),
      cia: z.enum(["1ª CIA PM", "2ª CIA PM", "3ª CIA PM", "4ª CIA PM", "CIA-FT", "EM"]),
    }).parse(data),
  )
  .handler(async ({ data }) => {
    const existing = await findUserByEmail(data.email);
    if (existing)
      throw new Error(
        "Este e-mail já está cadastrado. Utilize outro e-mail ou faça login com o existente.",
      );

    const sameRE = await findUserByRE(data.re);
    if (sameRE)
      throw new Error(
        `O RE ${data.re} já está cadastrado para ${sameRE.nome || "outro usuário"}. Verifique os dados informados.`,
      );

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
      cia: data.cia,
      nomeGuerra: data.nomeGuerra.trim(),
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

export const updateUserAction = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z.object({
      id: z.string(),
      nome: z.string().min(2),
      nomeGuerra: z.string().min(2),
      re: z.string().min(1),
      email: z.string().email(),
      telefone: z.string(),
      cia: z.string().optional(),
      grupo: z.enum(["Administrador", "Oficiais", "Supervisor", "Usuario"]),
      ativo: z.enum(["SIM", "NAO"]),
    }).parse(data),
  )
  .handler(async ({ data }) => {
    const cookie = getCookie(SESSION_COOKIE);
    let session: SessionData | null = null;
    if (cookie) {
      try { session = JSON.parse(cookie) as SessionData; } catch {}
    }
    if (!session || session.group !== "Administrador") throw new Error("Acesso negado.");

    const users = await fetchAllUsers();
    const existing = users.find((u) => u.id === data.id);
    if (!existing) throw new Error("Usuário não encontrado.");

    const updatedUser: UserRow = {
      ...existing,
      ...data,
      email: data.email.toLowerCase().trim(),
      nomeGuerra: data.nomeGuerra.trim(),
    };
    await updateUser(data.id, updatedUser);
    return { ok: true };
  });

export const deleteUserAction = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ id: z.string() }).parse(data))
  .handler(async ({ data }) => {
    const cookie = getCookie(SESSION_COOKIE);
    let session: SessionData | null = null;
    if (cookie) {
      try { session = JSON.parse(cookie) as SessionData; } catch {}
    }
    if (!session || session.group !== "Administrador") throw new Error("Acesso negado.");
    
    if (session.userId === data.id) throw new Error("Não é possível excluir o próprio usuário.");

    const success = await deleteUser(data.id);
    if (!success) throw new Error("Usuário não encontrado ou erro ao excluir.");
    return { ok: true };
  });

export const resetPasswordAction = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ id: z.string() }).parse(data))
  .handler(async ({ data }) => {
    const cookie = getCookie(SESSION_COOKIE);
    let session: SessionData | null = null;
    if (cookie) {
      try { session = JSON.parse(cookie) as SessionData; } catch {}
    }
    if (!session || session.group !== "Administrador") throw new Error("Acesso negado.");

    const users = await fetchAllUsers();
    const existing = users.find((u) => u.id === data.id);
    if (!existing) throw new Error("Usuário não encontrado.");

    const newPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    const updatedUser: UserRow = {
      ...existing,
      senha: hashedPassword
    };

    await updateUser(data.id, updatedUser);
    return { ok: true, newPassword };
  });

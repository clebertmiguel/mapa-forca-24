/** Tokens assinados (HMAC) para redefinição de senha, sem armazenamento. */
const enc = new TextEncoder();

function b64url(buf: ArrayBuffer | Uint8Array) {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64url(s: string) {
  return atob(s.replace(/-/g, "+").replace(/_/g, "/"));
}

function secret() {
  const s = process.env.RESET_TOKEN_SECRET || process.env.RESEND_API_KEY;
  if (!s) throw new Error("Configuração de redefinição de senha ausente.");
  return s;
}

async function sign(payload: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode(payload)));
}

/** A senha atual entra na assinatura: após trocar a senha o link deixa de valer. */
export async function createResetToken(userId: string, senhaAtual: string, ttlMs = 60 * 60 * 1000) {
  const exp = Date.now() + ttlMs;
  const body = b64url(enc.encode(`${userId}|${exp}`));
  const sig = await sign(`${userId}|${exp}|${senhaAtual}`);
  return `${body}.${sig}`;
}

export function parseResetToken(token: string) {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const [userId, expStr] = fromB64url(body).split("|");
  const exp = Number(expStr);
  if (!userId || !exp) return null;
  return { userId, exp, sig };
}

export async function verifyResetToken(token: string, senhaAtual: string) {
  const p = parseResetToken(token);
  if (!p || p.exp < Date.now()) return false;
  const expected = await sign(`${p.userId}|${p.exp}|${senhaAtual}`);
  return expected === p.sig;
}

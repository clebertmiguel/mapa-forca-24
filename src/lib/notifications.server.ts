/**
 * Server-only helper to send notifications.
 */
import { Resend } from 'resend';

const ADMIN_EMAIL = '24bpmidesenvolvimento@gmail.com'; // Novo e-mail de destino solicitado

const b64 = (s: string) =>
  btoa(Array.from(new TextEncoder().encode(s), (b) => String.fromCharCode(b)).join(''));
const hdr = (v: string) => (/^[\x00-\x7F]*$/.test(v) ? v : `=?UTF-8?B?${b64(v)}?=`);

/** Envia e-mail HTML pela conta Gmail conectada. */
export async function sendGmail(to: string, subject: string, html: string) {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const gmailKey = process.env.GOOGLE_MAIL_API_KEY;
  if (!lovableKey || !gmailKey) throw new Error("Envio de e-mail não configurado.");
  const raw = b64(
    [
      `To: ${to}`,
      `From: ${hdr('Mapa Força')} <me>`,
      `Subject: ${hdr(subject)}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset="UTF-8"',
      '',
      html,
    ].join('\r\n'),
  ).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const res = await fetch('https://connector-gateway.lovable.dev/google_mail/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${lovableKey}`,
      'X-Connection-Api-Key': gmailKey,
    },
    body: JSON.stringify({ raw }),
  });
  if (!res.ok) {
    console.error(`[Gmail] send failed [${res.status}]: ${await res.text()}`);
    throw new Error("Não foi possível enviar o e-mail de redefinição.");
  }
}

export async function sendPasswordResetEmail(to: string, nome: string, link: string) {
  await sendGmail(
    to,
    'Redefinição de senha - Mapa Força',
    `<div style="font-family: sans-serif; line-height: 1.5; color: #333;">
        <h2 style="color: #002d56;">Redefinição de senha</h2>
        <p>Olá, ${nome}. Recebemos um pedido para alterar sua senha.</p>
        <p><a href="${link}" style="background:#002d56;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;">Alterar minha senha</a></p>
        <p style="font-size:12px;color:#666;">O link vale por 1 hora. Se você não solicitou, ignore este e-mail.</p>
      </div>`,
  );
}

export async function sendNewUserAdminNotification(user: {
  nome: string;
  email: string;
  re: string;
  grupo: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  
  if (!apiKey) {
    console.error('[Notification] RESEND_API_KEY is not set. Email not sent.');
    return;
  }

  const resend = new Resend(apiKey);
  const date = new Date().toLocaleString('pt-BR', { timeZone: 'UTC' });

  try {
    const { data, error } = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: [ADMIN_EMAIL],
      subject: 'Novo Usuário Cadastrado no Sistema',
      html: `
        <div style="font-family: sans-serif; line-height: 1.5; color: #333;">
          <h2 style="color: #002d56;">Novo Usuário Cadastrado no Sistema</h2>
          <p>Um novo cadastro foi realizado com sucesso:</p>
          <hr style="border: 0; border-top: 1px solid #eee;" />
          <ul style="list-style: none; padding: 0;">
            <li><strong>Nome do Usuário:</strong> ${user.nome}</li>
            <li><strong>E-mail:</strong> ${user.email}</li>
            <li><strong>RE:</strong> ${user.re}</li>
            <li><strong>Grupo:</strong> ${user.grupo}</li>
            <li><strong>Data do Cadastro:</strong> ${date}</li>
          </ul>
          <hr style="border: 0; border-top: 1px solid #eee;" />
          <p style="font-size: 12px; color: #666;">Este é um e-mail automático enviado pelo sistema Mapa Força.</p>
        </div>
      `,
    });

    if (error) {
      console.error('[Notification] Error sending email via Resend:', error);
    } else {
      console.log('[Notification] Admin email sent successfully:', data?.id);
    }
  } catch (err) {
    console.error('[Notification] Unexpected error sending admin notification:', err);
  }
}

/**
 * Server-only helper to send notifications.
 */
import { Resend } from 'resend';

const ADMIN_EMAIL = 'clebertmiguel@gmail.com'; // E-mail final de destino

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

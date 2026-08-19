# Plano de Implementação: Notificações por E-mail

Adicionar funcionalidade para enviar uma notificação por e-mail automaticamente sempre que um novo usuário for cadastrado no sistema.

## Alterações

### 1. Configuração e Segredos
- O usuário deve adicionar o segredo `RESEND_API_KEY` via ferramenta `add_secret` (ou usaremos um Webhook se preferir, mas Resend é mais direto para e-mails estruturados).
- Definiremos o e-mail de destino padrão para as notificações.

### 2. Backend (Server Logic)
- Criar um helper `src/lib/notifications.server.ts` para lidar com o envio de e-mails.
- Implementar a função `sendNewUserAdminNotification` que formata e envia os detalhes do novo usuário.
- O envio será assíncrono (não bloqueará a resposta principal do cadastro).

### 3. Integração no Cadastro
- Atualizar a `serverFn` `registerUser` em `src/lib/auth.functions.ts` para chamar a função de notificação após o sucesso da inserção na planilha.
- Adicionar tratamento de erros (try/catch) para garantir que falhas no e-mail não impeçam a conclusão do cadastro.

### 4. UI e Feedback
- A interface de cadastro permanecerá a mesma, mas agora com a garantia de que o administrador será notificado.

## Detalhes Técnicos
- **Biblioteca**: `resend` (instalaremos via `bun add resend`).
- **Resiliência**: O processo de e-mail será disparado sem `await` no fluxo principal ou dentro de um bloco `try/catch` que apenas loga o erro, assegurando "fire-and-forget" behavior conforme solicitado.
- **Segurança**: Chaves de API serão mantidas apenas no servidor.

## Verificação
- Realizar um cadastro de teste e verificar os logs do servidor para confirmar a tentativa de envio.
- Validar se o fluxo de cadastro continua funcionando normalmente mesmo se a notificação falhar.

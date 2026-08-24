# Excluir a linha inteira do registro

## Objetivo
Ao confirmar a exclusão de um registro, remover fisicamente sua linha da aba `Records` no Google Sheets, em vez de apenas limpar os valores das células.

## Implementação
1. Manter o fluxo de segurança já existente: localizar o registro pelo ID e validar no servidor se o usuário pode excluí-lo.
2. Localizar novamente a posição atual do ID na aba `Records` imediatamente antes da remoção, evitando excluir uma linha incorreta após alterações concorrentes.
3. Consultar os metadados da planilha para obter o identificador numérico da aba `Records`.
4. Substituir a chamada `values/...:clear` por uma chamada `spreadsheets:batchUpdate` com `deleteDimension`, usando índices de linha zero-based e preservando a linha de cabeçalho.
5. Manter o retorno atual quando o ID não existir e melhorar a mensagem de erro se a aba `Records` não for encontrada.

## Validação
- Executar a exclusão de um registro de teste permitido e confirmar que a linha desaparece por completo e que as linhas abaixo sobem uma posição.
- Confirmar que um usuário sem permissão continua impedido de excluir registros de terceiros.
- Verificar que a listagem é atualizada após a exclusão e que criação/edição continuam funcionando.
- Conferir compilação e erros de execução após a alteração.

## Detalhes técnicos
A requisição estrutural usará `deleteDimension` com `dimension: "ROWS"`, `startIndex = númeroDaLinha - 1` e `endIndex = númeroDaLinha`, aplicados ao `sheetId` numérico da aba `Records`.

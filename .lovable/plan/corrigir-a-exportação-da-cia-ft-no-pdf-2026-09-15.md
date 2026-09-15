# Corrigir a exportação da CIA-FT no PDF

## Alteração
- Incluir a CIA-FT na sequência de grupos processados pelo gerador de PDF.
- Tornar a exportação tolerante a novas CIAs: qualquer CIA presente nos registros também será exportada, mesmo que não esteja na lista fixa.
- Preservar a quebra de página por CIA, o agrupamento por cidade e a ordenação crescente por hora.

## Validação
- Confirmar que um conjunto contendo CIA-FT é processado como bloco próprio.
- Verificar a compilação do aplicativo após a alteração.

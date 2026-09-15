# Incluir Nome Guerra e CIA no cadastro

## Alterações
- Adicionar o campo **Nome Guerra** logo após **Nome Completo**.
- Adicionar o seletor obrigatório **CIA** com: 1ª CIA PM, 2ª CIA PM, 3ª CIA PM, 4ª CIA PM, CIA-FT e EM.
- Manter os dados preenchidos caso o cadastro seja recusado.

## Salvamento
- Atualizar o envio do cadastro e o modelo de usuário.
- Gravar **CIA** na coluna I e **Nome Guerra** na coluna J da aba `Users`.
- Ampliar a leitura e a gravação da aba `Users` até a coluna J, preservando os campos existentes e as validações de duplicidade.

## Validação
- Conferir o cadastro na tela e verificar que o projeto continua sem erros.

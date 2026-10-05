# Corrigir falso cadastro duplicado

## Objetivo
Permitir o cadastro de MONICA ELISABETE DA SILVA quando não houver e-mail ou RE realmente idêntico na aba Users.

## Alterações
- Corrigir a normalização do RE para preservar o dígito verificador alfanumérico, removendo apenas máscara, espaços e zeros iniciais do número principal.
- Ajustar a máscara do campo RE para aceitar seis dígitos e um dígito verificador numérico ou letra.
- Manter a validação de e-mail sem diferenciar maiúsculas/minúsculas.
- Informar claramente qual e-mail ou RE existente causou um bloqueio verdadeiro, sem apagar ou alterar usuários existentes.
- Validar cadastro e compilação após a correção.

## Detalhes técnicos
A comparação atual remove todas as letras do RE. Isso pode considerar iguais dois REs com o mesmo número principal e dígitos verificadores diferentes. A nova comparação usará o número e o dígito verificador completos.

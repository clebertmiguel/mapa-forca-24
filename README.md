# Mapa Força - LOGIN

Sistema de Mapa Força Diário da Polícia Militar

Fonte de Dados

Toda a aplicação deverá utilizar como banco de dados a seguinte planilha do Google Sheets:

https://docs.google.com/spreadsheets/d/1Vi8-J6gvIE559Q5NQ4D9oV_o9mS0CtmHuxmYJRRPK6A/edit?usp=sharing

A aplicação deverá conectar-se diretamente a esta planilha para realizar operações de leitura e gravação dos dados.

Requisitos obrigatórios:

Ler automaticamente todos os dados da planilha.

Inserir novos registros diretamente na planilha.

Atualizar registros futuramente sem necessidade de alteração estrutural.

Nunca utilizar banco de dados local.

Toda a persistência deverá ocorrer exclusivamente nesta planilha Google.

Dashboard (Tela Inicial)

Ao abrir o sistema, deverá ser exibido somente o Mapa Força do dia atual.

A data atual deverá ser aplicada automaticamente como filtro principal.

A tabela deverá exibir exatamente todas as colunas existentes na planilha, respeitando sua ordem.

Recursos obrigatórios

Exibir apenas registros do dia atual.

Pesquisa rápida.

Ordenação por coluna.

Paginação.

Cabeçalho fixo.

Atualização automática após inclusão.

Layout profissional.

Ao final da tabela deverá existir o botão:

+ Novo Registro

Cadastro de Registro

Ao clicar em Novo Registro, abrir um formulário contendo todos os campos existentes na planilha.

Após salvar:

gravar imediatamente na planilha Google;

atualizar automaticamente a tela inicial mantendo o filtro da data atual.

Campos Select

Os campos abaixo deverão ser do tipo Select (Dropdown):

Graduação

Companhia (CIA)

Cidade

Viatura

Esses valores deverão ser carregados automaticamente de uma aba específica da própria planilha Google.

Nenhum valor poderá ser codificado manualmente.

Menu Superior

Criar um menu superior contendo:

Dashboard

Novo Registro

Relatório do Dia

Relatório por Data

Relatório do Dia

Gerar automaticamente um PDF contendo apenas os registros da data atual.

Os registros deverão ser agrupados obrigatoriamente na seguinte ordem:

1ª CIA

2ª CIA

3ª CIA

4ª CIA

CIA Força Tática

Cada companhia deverá possuir um cabeçalho.

O relatório deverá conter:

Brasão da Polícia Militar (caso seja disponibilizado posteriormente);

título;

data de referência;

data e hora de emissão;

total geral de policiais;

total por companhia;

numeração das páginas;

layout A4 profissional.

Relatório por Data

Criar um botão denominado Relatório por Data.

Ao clicar:

abrir um calendário (Date Picker);

permitir selecionar qualquer data existente na planilha;

gerar o PDF utilizando exatamente o mesmo layout do Relatório do Dia.

Também deverá:

agrupar por Companhia;

respeitar a ordem:

1ª CIA

2ª CIA

3ª CIA

4ª CIA

CIA Força Tática

Interface

Desenvolver um layout premium utilizando:

Material Design;

Cards;

Sombras suaves;

Bordas arredondadas;

Ícones modernos;

Cores institucionais da Polícia Militar (azul, branco e cinza);

Responsividade completa para desktop, tablet e celular.

Arquitetura

Desenvolver a aplicação de forma modular e escalável.

Organizar o código em componentes reutilizáveis.

Preparar a estrutura para futuras funcionalidades como:

autenticação de usuários;

controle de permissões;

edição de registros;

exclusão de registros;

auditoria;

histórico de alterações;

exportação para Excel;

dashboard estatístico;

gráficos;

indicadores operacionais.

Todo o código deverá ser limpo, documentado e seguindo boas práticas de desenvolvimento.

Integração com Google Sheets

A conexão deverá ser realizada diretamente utilizando o link da planilha informado acima.

Sempre que houver inclusão de registros, os dados deverão ser gravados automaticamente na planilha, sem necessidade de sincronização manual.

A aplicação deverá tratar erros de conexão, informar falhas ao usuário e manter a integridade dos dados.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://mapa-forca-24.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/42974b74-0761-4bf7-94e8-b6671094471e).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

# WA Web Message Monitor

Extensao para navegador focada em monitoramento de mensagens no WhatsApp Web, com captura de eventos no contexto da pagina, persistencia em storage local e visualizacao em painel lateral com tabela paginada.

Este projeto foi baseado no repositório:
https://github.com/purpshell/wa-web-translate

## Do que se trata

O projeto injeta scripts no WhatsApp Web para observar o fluxo de mensagens e disponibiliza os dados coletados em uma interface React dentro da extensao.

Principais pontos:
- Injecao de scripts em https://web.whatsapp.com
- Persistencia local usando chrome.storage
- Painel lateral para visualizar historico
- Tabela com paginacao e controles de navegacao
- Interface moderna para leitura dos dados

## Tecnologias

- TypeScript
- React
- Vite
- CRXJS (Manifest V3)

## Requisitos

- Node.js 18+
- pnpm (recomendado)
- Google Chrome ou navegador compativel com extensoes Chromium

## Instalacao

1. Clone o repositorio:

   git clone https://github.com/Santosl2/wa-messages-monitor

2. Entre na pasta do projeto:

   cd wa-messages-monitor

3. Instale as dependencias:

   pnpm install

## Rodando em desenvolvimento

1. Suba o modo dev:

   pnpm dev

2. Gere o build da extensao para carregar no navegador:

   pnpm build

## Como instalar a extensao no Chrome

1. Execute o build:

   pnpm build

2. Abra o Chrome em:

   chrome://extensions/

3. Ative o Modo do desenvolvedor.

4. Clique em Carregar sem compactacao.

5. Selecione a pasta dist gerada pelo build.

6. Abra o WhatsApp Web e use o painel lateral da extensao.

## Scripts disponiveis

- pnpm dev: inicia o ambiente de desenvolvimento com Vite
- pnpm build: valida TypeScript e gera a pasta dist
- pnpm preview: faz preview local do build

## Permissoes usadas

- storage: salvar e ler mensagens coletadas
- sidePanel: exibir a interface da extensao no painel lateral
- host permission em https://web.whatsapp.com/* para executar content scripts

## Estrutura resumida

- src/hooks: hooks injetados no contexto do WhatsApp Web
- src/content: ponte entre pagina e storage da extensao
- src/sidepanel: interface React do painel lateral
- manifest.config.ts: configuracao do Manifest V3

## Observacoes

Use este projeto com responsabilidade e respeitando termos de uso da plataforma, privacidade e legislacao aplicavel na sua regiao.

## Licença
MIT License
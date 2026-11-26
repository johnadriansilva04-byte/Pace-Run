# PACE RUN

Câmera esportiva com telemetria ao vivo: grava corridas, caminhadas e pedais com distância, pace,
velocidade e elevação desenhados no próprio vídeo. Distribuído como PWA instalável, com prioridade
para Android + Chrome.

## Rotas

| Rota                       | Papel                                                                                                                                                    |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                        | Landing page de instalação (apresentação, demonstração do painel, botão INSTALAR PACE RUN). Redireciona para `/inicio` quando aberta em modo standalone. |
| `/inicio`                  | Página inicial do aplicativo. É o `start_url` do manifest, então a primeira abertura pelo ícone cai aqui.                                                |
| `/preparar`                | Escolha da atividade e verificação de câmera, GPS e microfone. GPS negado não bloqueia: avisa que distância e pace ficam zerados.                        |
| `/camera`                  | Gravação: câmera + painel no canvas que também alimenta o `MediaRecorder`.                                                                               |
| `/galeria`, `/galeria/$id` | Gravações salvas no IndexedDB (reproduzir, salvar, compartilhar, excluir) e parciais por km/milha.                                                       |
| `/conquistas`              | Medalhas, recordes pessoais, sequência de dias e próximo objetivo, calculados do histórico local.                                                        |
| `/configuracoes`           | Unidades, indicadores visíveis, formato, qualidade, áudio e sincronização.                                                                               |

## PWA

- `public/manifest.webmanifest` — `display: standalone`, `start_url: /inicio?fonte=pwa`, ícones
  `any` e `maskable` em 192/512, atalhos para iniciar atividade e abrir a galeria.
- `public/icons/*` — ícones PNG 16/32/180/192/512. Regerar com `node scripts/generate-icons.mjs`
  (desenha o símbolo e codifica o PNG sem dependências externas).
- `public/sw.js` — navegação network-first (com fallback para a página em cache e depois
  `offline.html`); estáticos e fontes em stale-while-revalidate. O shell (`/` e `/inicio`) é
  pré-cacheado na instalação.
- `src/lib/service-worker.ts` — registra o worker apenas em produção e somente depois do `load`.
- `src/lib/pwa.ts` — captura `beforeinstallprompt` no escopo do módulo (o evento pode disparar antes
  da hidratação), detecta standalone/instalado, identifica a plataforma e descreve as instruções
  manuais por navegador.
- `public/_headers` e `vercel.json` — `sw.js` e manifest sem cache longo; ícones com cache de 7 dias.

### Fluxo de instalação

1. O usuário abre `/` no navegador.
2. O botão INSTALAR PACE RUN usa `beforeinstallprompt` quando disponível.
3. Sem o evento, o botão leva às instruções do navegador detectado (Chrome/Samsung/Firefox no
   Android, Safari no iOS, Chrome/Edge no desktop).
4. Após instalar, o ícone abre `/inicio` em modo standalone, sem barra do navegador.

Instalar não pede câmera nem localização. Em `/preparar`, as permissões só são solicitadas depois do
toque em VERIFICAR CÂMERA, GPS E MICROFONE; a câmera abre para o teste e é desligada em seguida.

## Recompensas

Tudo é derivado das atividades já salvas no aparelho (`src/lib/rewards.ts`, funções puras com
testes): nada de estado paralelo que possa divergir do histórico.

- **No painel (HUD)**: abaixo do medidor de distância aparece `FALTAM 320 M` até o próximo km/milha,
  e cada km fechado dispara o cartão de parabéns com parcial e ritmo, gravado no vídeo.
- **No fim da gravação**: `RewardCard` mostra distância, tempo, pace, elevação, parciais, recordes
  pessoais batidos e medalhas desbloqueadas naquela atividade, com atalhos para o vídeo e para as
  conquistas.
- **Em `/conquistas`**: distância total, atividades, dias seguidos, melhor parcial, próximo objetivo
  com barra de progresso, medalhas por grupo (distância acumulada, percurso único, constância,
  sequência) e recordes pessoais.

## Desenvolvimento

```sh
npm install
npm run dev      # http://localhost:8080
npm test         # vitest (manifest, service worker, instalação, permissões)
npm run lint
npm run build
```

O service worker não é registrado em `npm run dev`. Para testar cache/offline, gere o build e sirva
em HTTPS (ou `localhost`).

## Deploy

Produção: <https://pace-run-tan.vercel.app> — projeto Vercel `pace-run` (preset
`tanstack-start-lovable`), ligado a este repositório: cada push em `main` publica.
Variáveis de build na Vercel: `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`
(projeto Supabase `pace-run`, tabelas de `supabase-setup/schema.sql`).

O build é Nitro; o alvo padrão do projeto é Cloudflare. Para publicar em outro alvo, escolha o preset
no build:

```sh
NITRO_PRESET=vercel npm run build      # Vercel (saída em .vercel/output)
NITRO_PRESET=node-server npm run build # Node (saída em .output/server/index.mjs)
```

`vercel.json` mantém `sw.js` e o manifest fora de cache longo — se o service worker ficar preso em CDN,
uma nova versão do app não chega aos usuários instalados.

## Avisos durante a atividade

- A cada km (ou milha) o painel mostra um cartão `PARABÉNS` com o tempo e o pace da parcial e toca
  um aviso de duas notas.
- Quando a parcial é mais rápida que a melhor anterior, o cartão vira `RECORDE DE RITMO` com três
  notas. A primeira parcial é só referência — não existe recorde antes dela.
- Parciais abaixo de 20 s ou acima de 3 h são descartadas (salto de GPS, não corrida).
- O cartão é desenhado no canvas gravado, então aparece no vídeo. O som é sintetizado com Web Audio
  (sem arquivos, funciona offline) e sai só no alto-falante — com "Gravar áudio original" ligado ele
  pode ser captado pelo microfone.
- `Configurações → Avisos durante a atividade` liga/desliga os cartões e o som.
- A distância do painel é interpolada entre fixes (até 1,5 s) para o número não congelar; o valor
  gravado na atividade continua sendo o medido pelo GPS.

## Desempenho da câmera

- O painel é desenhado num canvas offscreen a 5 Hz e apenas composto sobre o quadro: texto,
  gradiente e formas saem do caminho do vídeo.
- Frames limitados a 30 fps com `createPacer` — sem isso uma tela de 120 Hz redesenha o canvas
  1080×1920 a 120 fps.
- Gradientes e strings de fonte ficam em cache por tamanho; `shadowBlur` foi removido (é uma das
  operações mais caras no canvas do Android).
- O stream da câmera é pedido no tamanho do canvas: 720p pede 1280×720 em vez de 1080p.
- Em aparelho fraco, o primeiro ajuste é `Configurações → 720p` (canvas 720×1280).

## Compatibilidade

Prioridade: Android com Chrome, instalado pela landing page. iPhone/iPad instalam pelo Safari
(Compartilhar → Adicionar à Tela de Início). O container gravado depende do `MediaRecorder` do
navegador: MP4 quando houver suporte a `avc1`, senão WebM.

## Teste em dispositivo real (pendente)

O que já foi verificado em ambiente automatizado: manifest válido, ícones com as dimensões
declaradas, registro e ativação do service worker, abertura offline a partir do cache, captura de
`beforeinstallprompt` pelo Chrome, instruções por navegador e a ausência de pedido de permissão
antes da verificação.

O que ainda precisa de aparelho físico — não trate como suportado antes de validar:

- [ ] Instalar pelo botão no Android/Chrome e abrir pelo ícone em modo standalone.
- [ ] Primeira abertura cair em `/inicio`, sem barra do navegador.
- [ ] Câmera traseira/dianteira, enquadramentos 9:16, 16:9 e 1:1.
- [ ] GPS: precisão, distância acumulada, pace e velocidade em movimento real.
- [ ] `MediaRecorder` + `captureStream` com áudio do microfone.
- [ ] Gravação longa (30 min+) e comportamento de memória/armazenamento.
- [ ] Exportação: MP4 quando disponível, WebM como alternativa; reprodução na galeria e download.
- [ ] Tela ligada durante a gravação (Wake Lock) e rotação do aparelho.
- [ ] iOS: instalação pelo Safari e suporte do Safari ao `MediaRecorder`.

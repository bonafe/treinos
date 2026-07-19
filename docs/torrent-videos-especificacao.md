# Especificação — Vídeos via torrent (WebTorrent)

## 1. Objetivo

Hoje `exercicio.videoUrl` e `aquecimentoPadrao.videoUrl` (seções 3.4/3.5 de
[treino-exercicios-especificacao.md](./treino-exercicios-especificacao.md))
apontam pra um link externo qualquer, aberto numa nova aba — depende de
alguém pagar hospedagem/banda (ou de uma plataforma de terceiros). Pra
manter o princípio de plataforma gratuita e comunitária (ver
[index.html](../index.html)), os vídeos passam a ser distribuídos por
**torrent**: quem assiste também vira fonte pra quem assistir depois — o
vídeo literalmente é mantido pela comunidade, não por um servidor.

No navegador, a única forma de falar BitTorrent é via **WebTorrent**
(protocolo por cima de WebRTC) — o BitTorrent "clássico" usa DHT/UDP, que
o navegador não acessa.

Decisões já tomadas (não reabrir sem motivo forte):
- **Sem fallback pra hospedagem externa.** Se o vídeo ainda não chegou, a
  tela mostra estado de carregamento — nunca um link alternativo.
- **Pelo menos um seed fixo, sempre ligado** (máquinas dos mantenedores),
  garantindo que sempre existe uma fonte disponível, principalmente
  enquanto a comunidade de seeders (alunos com o navegador aberto) ainda é
  pequena.
- **Pré-carregar tudo assim que o JSON do plano de treino é carregado no
  `localStorage`** — todos os vídeos de todos os treinos de uma vez, sem
  precisar entrar em nenhum treino específico primeiro.

## 2. Visão geral do fluxo

```
dados_treinos.json (videoMagnet em vez de videoUrl)
   → WebTorrent client (vendorizado, 1 instância por aba)
        → baixa peças via WebRTC dos peers do swarm (seed(s) fixo(s) + outros alunos)
             → grava o Blob completo no Cache API (cache "treinos-videos.v1")
                  → <video> toca a partir do Blob local, sem rede
```

Depois de baixado uma vez por aparelho, o vídeo nunca é buscado de novo —
mesmo princípio de offline-depois-do-primeiro-carregamento já usado pro
resto do site (ver
[pwa-offline-especificacao.md](./pwa-offline-especificacao.md)).

## 3. Biblioteca

`webtorrent.min.js` (bundle de navegador) vendorizado na raiz do projeto,
mesmo padrão já usado pra [`d3.v7.min.js`](../d3.v7.min.js): sem CDN, pra
continuar funcionando offline e continuar 100% auditável (código aberto).

## 4. Descoberta de peers (trackers)

WebTorrent depende de um **tracker WebSocket** (`wss://`) pra sinalização
WebRTC entre navegadores — sem ele, dois navegadores não se encontram.
Cada magnet lista múltiplos trackers, com esta ordem de prioridade:

1. Um tracker próprio, auto-hospedado na mesma máquina de algum seed fixo
   (seção 5) — não depender só de terceiros pra sinalização. Existem
   implementações prontas (ex. `bittorrent-tracker`), rodando como um
   processo simples ao lado do seed.
2. Trackers públicos abertos como reserva (ex.
   `wss://tracker.openwebtorrent.com`, `wss://tracker.btorrent.xyz`) —
   gratuitos, mas fora do nosso controle (podem cair ou mudar).

## 5. Seed(s) fixo(s)

Pelo menos um seed sempre ligado (computador pessoal do mantenedor +
colegas) evita o problema de "swarm frio" — torrent sem nenhuma fonte
disponível — principalmente agora no início, quando a base de alunos
seedando de volta ainda é pequena.

- Prática: rodar um cliente WebTorrent em modo semente (`webtorrent seed
  <arquivo> --keep-seeding`, ou equivalente) nessas máquinas, uma vez por
  vídeo, e usar o magnet gerado ali no `dados_treinos.json` (seção 9).
- Todo aluno que baixa um vídeo também vira seed automático enquanto
  estiver com a aba aberta (comportamento padrão do WebTorrent) — a
  comunidade cresce como fonte com o tempo, sem nenhuma ação manual.
- Fora de escopo por ora: script/README formal de "como subir um seed"
  pros mantenedores — tratar como operação manual até virar necessidade
  real.

## 6. Armazenamento local: Cache API, não localStorage nem IndexedDB

Vídeo é Blob binário: `localStorage` só guarda string e tem quota pequena
(não serve, ver seção 6 de
[armazenamento-local-especificacao.md](./armazenamento-local-especificacao.md#6-limitações)).
**Cache API** é a escolha certa — mesma API já usada por
[`sw.js`](../sw.js) pro app shell — guarda o `Response`/Blob completo,
sobrevive fechar aba/navegador, e só some se o usuário limpar dados do
site (mesma limitação já aceita hoje pro resto do armazenamento).

- Cache dedicado e próprio: `treinos-videos.v1` — nome separado do
  `treinos-shell-v4` do app shell (são coisas diferentes; o app shell é
  atualizado pela rede quando disponível, o cache de vídeo nunca é
  invalidado/atualizado automaticamente).
- Chave: o **infohash** do magnet (identifica o conteúdo em si), não uma
  URL — não existe URL de origem nenhuma pra esses vídeos.
- Antes de iniciar qualquer download, checar se a chave já existe nesse
  cache — só baixa uma vez por aparelho, depois disso é local puro.
- Pedir `navigator.storage.persist()` na primeira vez que um vídeo é
  salvo, reduzindo o risco do navegador despejar esse cache sob pressão de
  espaço (comportamento padrão de "cache normal", diferente de storage
  persistente).

## 7. Estados de carregamento (UI)

Cada vídeo (card de exercício em `treino_exercicios.html`, aquecimento,
tela de execução em `treino_execucao.html`) tem um estado observável:

| Estado | Quando | UI |
|---|---|---|
| `nao-iniciado` | Ainda não foi pedido nem pré-carregado | Nada visível ainda |
| `baixando` | `client.add(magnet)` disparado, sem estar completo | Indicador com progresso (`torrent.progress`, ~1×/seg) — ex. "Baixando vídeo… 42%" |
| `pronto` | Já está no Cache API (desta sessão ou de uma visita anterior) | Botão "Ver vídeo" habilitado, toca direto do Blob local, sem rede |
| `erro` | Magnet inválido/ausente no JSON | Mensagem simples — sem link de reserva externo |

Sem fallback: se o swarm estiver frio (nenhum peer respondendo ainda), a
tela mantém "Baixando vídeo… procurando outros aparelhos" indefinidamente
até achar um peer — não existe link de vídeo alternativo (decisão da
seção 1).

## 8. Pré-carregamento: dataset inteiro, no carregamento do JSON

O gatilho não é entrar num treino específico — é o **JSON do plano de
treino entrar no `localStorage`**. Nesse momento, todos os vídeos de
**todos** os treinos já são disparados pra download de uma vez: cada
entrada de `dados.exercicios[exercicioId].videoMagnet` (dicionário de
referência, seção 3.5 de
[treino-exercicios-especificacao.md](./treino-exercicios-especificacao.md#35-exercicios) —
por definição já é só o que é citado em algum treino) mais
`dados.aquecimentoPadrao.videoMagnet`. Não é preciso abrir
`treino_exercicios.html?treino=<id>` de nenhum treino em particular pra
disparar o download dele.

- **Gatilho principal**: `TreinosStorage.definirDadosTreinos(dados)` —
  chamado por `importar_dados.html` ao salvar um JSON novo (seção 3.3 de
  [armazenamento-local-especificacao.md](./armazenamento-local-especificacao.md#33-treinosstoragedefinirdadostreinosdados)) —
  dispara o download de todo o dicionário `exercicios` + o aquecimento
  padrão.
- **Gatilho de reforço**: `TreinosStorage.carregarDadosTreinos()` bem
  sucedido em `sistema.html` (a tela por onde toda navegação do sistema
  passa) também dispara a mesma checagem — cobre o
  caso de já existir JSON salvo mas nem todo vídeo ter sido baixado ainda
  (aba fechada no meio do download, backup restaurado num aparelho novo,
  etc.). Como o download checa o Cache API antes de baixar (seção 6),
  disparar de novo é barato: vídeo já presente é só um `cache.match`
  (praticamente instantâneo), sem nenhuma requisição de rede.
- Cada card de exercício (em `treino_exercicios.html`, quando o aluno
  chega lá) já mostra o estado real (seção 7) — `pronto` se o
  pré-carregamento global já tiver terminado aquele vídeo específico,
  `baixando X%` se ainda estiver em andamento, sem esperar o aluno entrar
  no treino pra começar.

## 9. Mudança no schema: `videoUrl` → `videoMagnet`

Em `dados/dados_treinos.json`:
- `exercicios[exercicioId].videoUrl` → `exercicios[exercicioId].videoMagnet`
- `aquecimentoPadrao.videoUrl` → `aquecimentoPadrao.videoMagnet`

Valor: uma magnet URI (`magnet:?xt=urn:btih:...`) gerada ao seedar o
arquivo pela primeira vez (seção 5). Ver
[treino-exercicios-especificacao.md](./treino-exercicios-especificacao.md#34-aquecimentopadrao)
(seções 3.4 e 3.5) — atualizar esses trechos junto quando isso for
implementado.

## 10. Player

Magnet não é uma URL "abrível" numa nova aba — o botão "Ver vídeo" abre um
player embutido (modal) com `<video>` apontando pro Blob local
(`URL.createObjectURL(blob)`) assim que o estado for `pronto` (seção 7).
Enquanto `baixando`, o botão mostra o progresso em vez de "Ver vídeo →".

Implementado em `js/video-player-modal.js`, função `ligarBotaoVideo(botaoEl,
fonte, videoModal, deveAtualizar?)` — compartilhada por
`treino_exercicios.html` (cards de exercício + aquecimento) e
`treino_execucao.html` (tela de execução guiada). `fonte` é o objeto do
exercício/aquecimento; `videoMagnet` tem prioridade (fluxo desta
especificação). Se só houver `videoUrl` (campo legado — item ainda não
migrado pra torrent, ver seção 9), o botão mantém o comportamento antigo:
`window.open(fonte.videoUrl, "_blank", "noopener")`, sem passar pelo
WebTorrent. Isso não é o fallback rejeitado na seção 1 (que é sobre não
fugir do torrent quando *aquele mesmo* vídeo não tem seeders) — é
coexistência de dois vídeos diferentes enquanto o acervo é migrado aos
poucos. `deveAtualizar` é um guard opcional contra atualização de estado
obsoleta, necessário só onde o mesmo botão é reaproveitado por exercícios
diferentes ao longo do tempo (`treino_execucao.html`, ao navegar entre
exercícios pelo stepper enquanto um vídeo anterior ainda está baixando).

## 11. Fora de escopo (por ora)

- Múltiplas qualidades/transcodificação de vídeo.
- Upload de vídeo novo pela interface — o `.torrent`/magnet de cada vídeo
  é gerado manualmente por quem mantém os vídeos, fora do site, e colado
  no `dados_treinos.json` como qualquer outro campo (mesmo fluxo manual
  já aceito hoje pro resto do JSON).
- Descoberta via DHT — o navegador não acessa DHT/UDP, só WebRTC via
  tracker (seção 4).
- Persistir progresso de download entre reloads no meio de um download —
  um reload reinicia aquele download do zero (peças já noutro cache não
  se perdem, só o download em andamento no momento do reload).
- Script/README formal de operação do(s) seed(s) fixo(s) (seção 5).

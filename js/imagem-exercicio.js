import { TreinosStorage } from "./storage.js";

const GENERO_PADRAO = "masculino";

// As imagens são geradas fora do site (src/python/gerar_imagens_treino.py)
// e salvas com nome previsível — não há campo na biblioteca apontando pra
// elas, então o caminho é sempre montado por convenção a partir do
// exercicioId e do gênero escolhido pelo aluno (configurações). Nem todo
// exercício tem imagem gerada ainda, então quem usa isso precisa tratar o
// caso de a imagem não existir (ver `ligarBotaoImagem`/`ligarImagemExercicio`).
export function obterGeneroImagem() {
  return TreinosStorage.lerJSON(TreinosStorage.chaves.generoImagem, GENERO_PADRAO);
}

export function definirGeneroImagem(genero) {
  TreinosStorage.salvarJSON(TreinosStorage.chaves.generoImagem, genero);
}

export function caminhoImagemExercicio(exercicioId, genero = obterGeneroImagem()) {
  return `biblioteca-exercicios/imagens-exercicios/${exercicioId}__${genero}.png`;
}

// Modal simples (mesmo padrão de #videoOverlay/criarVideoPlayerModal em
// video-player-modal.js) pra abrir a imagem em tamanho maior a partir do
// botão "Ver imagem" de um card de exercício.
export function criarImagemModal() {
  const overlayEl = document.getElementById("imagemOverlay");
  const imgEl = document.getElementById("imagemModalImg");
  const fecharEl = document.getElementById("imagemFechar");

  function fechar() {
    overlayEl.hidden = true;
  }

  fecharEl.addEventListener("click", fechar);
  overlayEl.addEventListener("click", (evento) => {
    if (evento.target === overlayEl) fechar();
  });

  return {
    abrir(src, alt) {
      imgEl.src = src;
      imgEl.alt = alt || "";
      overlayEl.hidden = false;
    }
  };
}

/**
 * Liga um botão "Ver imagem" a um exercício: só aparece quando a imagem
 * existe de fato (não há como saber isso a partir da biblioteca, então
 * tenta carregar e reage ao sucesso/falha).
 */
export function ligarBotaoImagem(botaoEl, exercicioId, nomeExercicio, imagemModal) {
  botaoEl.hidden = true;
  if (!exercicioId) return;

  const src = caminhoImagemExercicio(exercicioId);
  const probe = new Image();
  probe.onload = () => {
    botaoEl.hidden = false;
    botaoEl.disabled = false;
    botaoEl.textContent = "Ver imagem →";
    botaoEl.onclick = (evento) => {
      evento.stopPropagation();
      imagemModal.abrir(src, nomeExercicio);
    };
  };
  probe.src = src;
}

/**
 * Liga um <img> visível diretamente na tela (sem botão/modal) ao exercício
 * atual — usado em treino_execucao.html, onde a imagem fica sempre à
 * mostra. `deveAtualizar`, se informado, evita que o carregamento de uma
 * imagem antiga sobrescreva a tela depois que o aluno já avançou pra outro
 * exercício (mesmo problema resolvido em `ligarBotaoVideo`).
 */
export function ligarImagemExercicio(imgEl, exercicioId, nomeExercicio, deveAtualizar = () => true) {
  imgEl.hidden = true;
  if (!exercicioId) return;

  const src = caminhoImagemExercicio(exercicioId);
  const probe = new Image();
  probe.onload = () => {
    if (!deveAtualizar()) return;
    imgEl.src = src;
    imgEl.alt = nomeExercicio || "";
    imgEl.hidden = false;
  };
  probe.src = src;
}

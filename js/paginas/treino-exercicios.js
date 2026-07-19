import { TreinosStorage } from "../storage.js";
import { Formatadores } from "../formatadores.js";
import { LABEL_TIPO } from "../constantes.js";
import { criarVideoPlayerModal, ligarBotaoVideo } from "../video-player-modal.js";

const LABEL_AGRUPAMENTO = {
  superset: "Superset — fazer em sequência",
  sequencial: "Sequencial",
  circuito: "Circuito — uma série de cada por volta"
};

class TreinoExerciciosController {
  #videoModal = criarVideoPlayerModal();

  #gruposMusculares(grupoMuscular) {
    return [grupoMuscular.principal, grupoMuscular.sinergista1, grupoMuscular.sinergista2].filter(Boolean);
  }

  #montarGuia(guia) {
    const itens = [
      { titulo: "Ajuste de carga", texto: guia.ajusteCarga },
      { titulo: "Cadência", texto: guia.cadencia },
      { titulo: "Pausa entre séries", texto: `${guia.pausaSegundos.min} a ${guia.pausaSegundos.max} segundos.` },
      { titulo: "Cor cinza", texto: guia.corCinza },
      { titulo: "Superset", texto: guia.superSet },
      { titulo: "Isometria", texto: guia.isometria },
      { titulo: "Circuito", texto: guia.circuito }
    ];

    return itens.map((i) => `<li><strong>${i.titulo}:</strong> ${i.texto}</li>`).join("");
  }

  #montarAquecimento(treino, aquecimentoPadrao) {
    const secaoEl = document.getElementById("aquecimento");
    if (!treino.aquecimento) return;

    secaoEl.hidden = false;
    const textoEl = document.getElementById("aquecimentoTexto");
    const videoEl = document.getElementById("aquecimentoVideo");
    const partes = [];

    if (treino.aquecimento.usaPadrao) {
      partes.push(aquecimentoPadrao.texto);
      ligarBotaoVideo(videoEl, aquecimentoPadrao, this.#videoModal);
    } else {
      videoEl.hidden = true;
    }

    if (treino.aquecimento.extra) partes.push(treino.aquecimento.extra);

    textoEl.textContent = partes.join(" ");
  }

  #itemCard(item, exercicios, treinoId, slotIndex, opcaoIndex) {
    const exercicio = exercicios[item.exercicioId];
    const classes = ["item"];
    if (item.tecnica === "isometria") classes.push("isometria");
    if (item.substituto) classes.push("substituto");

    const grupos = this.#gruposMusculares(item.grupoMuscular);
    const nome = exercicio ? exercicio.nome : item.exercicioId;
    const execucaoUrl = `treino_execucao.html?treino=${encodeURIComponent(treinoId)}&exercicio=${slotIndex}&opcao=${opcaoIndex}`;
    const progressoUrl = `treino_exercicio_progresso.html?exercicio=${encodeURIComponent(item.exercicioId)}&treino=${encodeURIComponent(treinoId)}`;

    const div = document.createElement("div");
    div.className = classes.join(" ");
    div.tabIndex = 0;
    div.setAttribute("role", "link");
    div.innerHTML = `
      <div class="item-cabecalho">
        <span class="item-nome">${nome}</span>
        ${item.substituto ? '<span class="item-substituto-label">Substituto</span>' : ""}
      </div>
      ${grupos.length ? `<div class="item-grupos">${grupos.map((g) => `<span>${g}</span>`).join("")}</div>` : ""}
      <div class="item-detalhes">
        <span><strong>${item.series}</strong> séries</span>
        <span>${this.#formatarRepeticoes(item.repeticoes)}</span>
      </div>
      ${item.tecnica === "isometria" ? '<div class="item-isometria-nota">Isometria de 20s a 50% da amplitude, nas duas últimas séries.</div>' : ""}
      <div class="item-acoes">
        <button type="button" class="ver-video" hidden></button>
        <a class="ver-progresso" href="${progressoUrl}">Ver progresso →</a>
      </div>
    `;

    div.addEventListener("click", () => {
      window.location.href = execucaoUrl;
    });
    div.addEventListener("keydown", (evento) => {
      if (evento.key === "Enter" || evento.key === " ") {
        evento.preventDefault();
        window.location.href = execucaoUrl;
      }
    });

    ligarBotaoVideo(div.querySelector(".ver-video"), exercicio, this.#videoModal);

    div.querySelector(".ver-progresso").addEventListener("click", (evento) => {
      evento.stopPropagation();
    });

    return div;
  }

  #formatarRepeticoes(repeticoes) {
    if (repeticoes.modo === "faixa") return `${repeticoes.min} a ${repeticoes.max} repetições`;
    if (repeticoes.modo === "tempo") return `${repeticoes.segundos} segundos`;
    return "Máximo de repetições";
  }

  #montarBlocos(treino, exercicios) {
    const blocosEl = document.getElementById("blocos");
    const vazioEl = document.getElementById("vazio");

    if (!treino.blocos.length) {
      vazioEl.hidden = false;
      return;
    }

    let slotIndex = -1;
    let opcaoIndex = 0;

    treino.blocos.forEach((bloco) => {
      const blocoEl = document.createElement("div");
      blocoEl.className = "bloco";

      const rotulo = bloco.grupo ? `Bloco ${bloco.grupo} · ` : "";
      const agrupamento = LABEL_AGRUPAMENTO[bloco.tipoAgrupamento] || bloco.tipoAgrupamento;

      const itensEl = document.createElement("div");
      itensEl.className = "itens";
      bloco.itens.forEach((item) => {
        if (item.substituto && slotIndex >= 0) {
          opcaoIndex += 1;
        } else {
          slotIndex += 1;
          opcaoIndex = 0;
        }
        itensEl.appendChild(this.#itemCard(item, exercicios, treino.id, slotIndex, opcaoIndex));
      });

      blocoEl.innerHTML = `<h3 class="bloco-titulo">${rotulo}${agrupamento}</h3>`;
      blocoEl.appendChild(itensEl);
      blocosEl.appendChild(blocoEl);
    });
  }

  #montarCardio(cardio, cardioId, treinoId) {
    if (!cardio) return;

    document.getElementById("cardio").hidden = false;
    document.getElementById("cardioCampos").innerHTML = `
      <div class="campo"><strong>Exercício</strong><span>${cardio.exercicio}</span></div>
      <div class="campo"><strong>Séries</strong><span>${cardio.series}</span></div>
      <div class="campo"><strong>Tempo de estímulo</strong><span>${Formatadores.tempoCurto(cardio.tempoEstimulo.segundos)}</span></div>
      <div class="campo"><strong>Recuperação</strong><span>${Formatadores.tempoCurto(cardio.recuperacao.segundos)}</span></div>
      <div class="campo"><strong>Intensidade do estímulo</strong><span>${Formatadores.labelIntensidade(cardio.intensidadeEstimulo)}</span></div>
      <div class="campo"><strong>Intensidade da recuperação</strong><span>${Formatadores.labelIntensidade(cardio.intensidadeRecuperacao)}</span></div>
    `;
    document.getElementById("cardioLink").href =
      `treino_bicicleta.html?cardio=${encodeURIComponent(cardioId)}&treino=${encodeURIComponent(treinoId)}`;
  }

  #mostrarErro(mensagem) {
    document.getElementById("carregando").hidden = true;
    const erroEl = document.getElementById("erro");
    erroEl.hidden = false;
    erroEl.innerHTML = `${mensagem} Volte ao <a href="treino_exercicios_menu.html">menu de treinos</a>.`;
    document.getElementById("titulo").textContent = "Treino de Exercícios";
  }

  #iniciarComDados(dados, treinoId) {
    const treino = dados.treinos.find((t) => t.id === treinoId);
    if (!treino) {
      this.#mostrarErro("Este treino não foi encontrado.");
      return;
    }

    document.getElementById("carregando").hidden = true;

    document.title = `${treino.nome} — Treino de Exercícios`;
    document.getElementById("titulo").textContent = treino.nome;

    const tipoTagEl = document.getElementById("tipoTag");
    tipoTagEl.hidden = false;
    tipoTagEl.textContent = LABEL_TIPO[treino.tipo] || treino.tipo;

    const guiaEl = document.getElementById("guiaDetails");
    guiaEl.hidden = false;
    document.getElementById("guiaLista").innerHTML = this.#montarGuia(dados.guia);

    this.#montarAquecimento(treino, dados.aquecimentoPadrao);
    this.#montarBlocos(treino, dados.exercicios);
    this.#montarCardio(dados.cardios[treino.cardioId], treino.cardioId, treino.id);

    if (treino.blocos.some((bloco) => bloco.itens.length)) {
      const iniciarEl = document.getElementById("iniciarTreino");
      iniciarEl.hidden = false;
      iniciarEl.href = `treino_execucao.html?treino=${encodeURIComponent(treino.id)}`;

      const progressoSalvo = TreinosStorage.lerJSON(TreinosStorage.chaves.execucaoMusculacao(treino.id), null);
      const emAndamento = progressoSalvo && progressoSalvo.slotIndex >= 0 && progressoSalvo.serieAtual >= 1;
      iniciarEl.textContent = emAndamento ? "Continuar treino →" : "Iniciar treino →";
    }
  }

  async iniciar() {
    const params = new URLSearchParams(window.location.search);
    const treinoId = params.get("treino");

    if (!treinoId) {
      this.#mostrarErro("Nenhum treino selecionado.");
      return;
    }

    try {
      const dados = await TreinosStorage.carregarDadosTreinos();
      this.#iniciarComDados(dados, treinoId);
    } catch (erro) {
      this.#mostrarErro('Nenhum dado de treino carregado ainda neste navegador. <a href="importar_dados.html">Carregue o arquivo dados_treinos.json</a> pra começar.');
    }
  }
}

new TreinoExerciciosController().iniciar();

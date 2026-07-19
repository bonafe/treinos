import { TreinosStorage } from "../storage.js";
import { Formatadores } from "../formatadores.js";
import { GraficoBarrasHistorico } from "../grafico-barras.js";

class TreinoBicicletaMenuController {
  #listaEl = document.getElementById("lista");

  iniciar() {
    this.#iniciarGraficoHistorico();
    this.#carregarTreinos();
  }

  #iniciarGraficoHistorico() {
    const historico = TreinosStorage.lerJSON(TreinosStorage.chaves.historicoSessaoBicicleta, []);
    const grafico = new GraficoBarrasHistorico({
      seletor: "#graficoBicicleta",
      historico,
      campoData: "dataHora"
    });
    grafico.inicializar(document.getElementById("graficoSecao"), document.getElementById("graficoVazio"));
  }

  #extrairConfig(cardioId, cardio) {
    return {
      id: cardioId,
      nome: cardio.nome,
      series: cardio.series,
      tempoEstimuloSegundos: cardio.tempoEstimulo.segundos,
      tempoRecuperacaoSegundos: cardio.recuperacao.segundos,
      intensidadeEstimulo: cardio.intensidadeEstimulo,
      intensidadeRecuperacao: cardio.intensidadeRecuperacao
    };
  }

  #cartaoTreino(cfg) {
    const a = document.createElement("a");
    a.className = "treino";
    a.href = `treino_bicicleta.html?cardio=${encodeURIComponent(cfg.id)}`;

    a.innerHTML = `
      <h2>${cfg.nome}</h2>
      <div class="campos">
        <div class="campo"><strong>Séries</strong><span>${cfg.series}</span></div>
        <div class="campo"><strong>Tempo de estímulo</strong><span>${Formatadores.tempoCurto(cfg.tempoEstimuloSegundos)}</span></div>
        <div class="campo"><strong>Recuperação</strong><span>${Formatadores.tempoCurto(cfg.tempoRecuperacaoSegundos)}</span></div>
        <div class="campo"><strong>Intensidade do estímulo</strong><span>${Formatadores.labelIntensidade(cfg.intensidadeEstimulo)}</span></div>
        <div class="campo"><strong>Intensidade da recuperação</strong><span>${Formatadores.labelIntensidade(cfg.intensidadeRecuperacao)}</span></div>
      </div>
    `;
    return a;
  }

  async #carregarTreinos() {
    try {
      const dados = await TreinosStorage.carregarDadosTreinos();
      const configs = Object.entries(dados.cardios)
        .filter(([, cardio]) => cardio.exercicio === "Bicicleta")
        .map(([cardioId, cardio]) => this.#extrairConfig(cardioId, cardio));

      this.#listaEl.innerHTML = "";
      if (!configs.length) {
        this.#listaEl.innerHTML = '<div class="estado">Nenhum treino de bicicleta cadastrado ainda.</div>';
        return;
      }
      configs.forEach((cfg) => this.#listaEl.appendChild(this.#cartaoTreino(cfg)));
    } catch (erro) {
      this.#listaEl.innerHTML =
        '<div class="estado">Nenhum dado de treino carregado ainda neste navegador. <a href="importar_dados.html">Carregue o arquivo dados_treinos.json</a> pra começar.</div>';
    }
  }
}

new TreinoBicicletaMenuController().iniciar();

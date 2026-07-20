import { TreinosStorage } from "../storage.js";
import { carregarBiblioteca } from "../biblioteca-exercicios.js";
import { Formatadores } from "../formatadores.js";
import { VideosTorrent } from "../videos-torrent.js";

// Só o plano de treino (dado pessoal) passa por aqui — a biblioteca de
// exercícios vem embutida no site e é carregada sozinha via fetch (ver
// js/biblioteca-exercicios.js).
const CAMPOS_OBRIGATORIOS = ["schema", "metadata", "distribuicaoSemanal", "treinos"];

class ImportarDadosController {
  #statusEl = document.getElementById("statusAtual");
  #mensagemEl = document.getElementById("mensagem");
  #arquivoInputEl = document.getElementById("arquivoInput");
  #jsonTextareaEl = document.getElementById("jsonTextarea");
  #salvarBtnEl = document.getElementById("salvarBtn");
  #baixarBtnEl = document.getElementById("baixarBtn");

  iniciar() {
    this.#arquivoInputEl.addEventListener("change", (evento) => this.#aoEscolherArquivo(evento));
    this.#salvarBtnEl.addEventListener("click", () => this.#aoSalvar());
    this.#baixarBtnEl.addEventListener("click", () => this.#aoBaixarBackup());
    this.#atualizarStatus();
  }

  #validarDados(dados) {
    return dados && typeof dados === "object" && CAMPOS_OBRIGATORIOS.every((campo) => campo in dados);
  }

  #atualizarStatus() {
    const dados = TreinosStorage.lerJSON("dadosTreinos.v2", null);
    const carregadoEm = TreinosStorage.lerJSON("dadosTreinosCarregadoEm.v1", null);

    if (!dados) {
      this.#statusEl.innerHTML = "Nenhum plano de treino carregado neste navegador ainda.";
      return;
    }

    const totalTreinos = Array.isArray(dados.treinos) ? dados.treinos.length : 0;
    const totalSeries = TreinosStorage.lerJSON("historico.serieMusculacao.v1", []).length;
    const totalSessoesBike = TreinosStorage.lerJSON("historico.sessaoBicicleta.v1", []).length;
    const sessoesLabel = totalSessoesBike === 1 ? "sessão" : "sessões";

    this.#statusEl.innerHTML =
      `<strong>${totalTreinos} treino${totalTreinos === 1 ? "" : "s"}</strong> carregados` +
      (carregadoEm ? ` em <strong>${Formatadores.dataHora(carregadoEm)}</strong>.` : ".") +
      `<br>${totalSeries} série${totalSeries === 1 ? "" : "s"} de musculação e ` +
      `${totalSessoesBike} ${sessoesLabel} de bike no histórico.`;
  }

  #mostrarMensagem(texto, tipo) {
    this.#mensagemEl.hidden = false;
    this.#mensagemEl.className = `mensagem ${tipo}`;
    this.#mensagemEl.innerHTML = texto;
  }

  #aoEscolherArquivo(evento) {
    const arquivo = evento.target.files[0];
    if (!arquivo) return;

    const leitor = new FileReader();
    leitor.onload = () => {
      this.#jsonTextareaEl.value = leitor.result;
    };
    leitor.readAsText(arquivo);
  }

  #aoSalvar() {
    const texto = this.#jsonTextareaEl.value.trim();

    if (!texto) {
      this.#mostrarMensagem("Escolha um arquivo ou cole o conteúdo do JSON antes de salvar.", "erro");
      return;
    }

    let dados;
    try {
      dados = JSON.parse(texto);
    } catch (erro) {
      this.#mostrarMensagem("Esse texto não é um JSON válido.", "erro");
      return;
    }

    if (dados && dados.tipo === "backup-treinos") {
      if (!this.#validarDados(dados.dadosTreinos)) {
        this.#mostrarMensagem("Esse backup não tem um plano de treino válido.", "erro");
        return;
      }
      TreinosStorage.restaurarBackup(dados);
      this.#prefetchVideosDaBiblioteca();
      this.#atualizarStatus();
      this.#mostrarMensagem(
        'Backup restaurado — plano de treino, histórico e progresso em andamento recuperados! Já dá pra usar o <a href="treino_exercicios_menu.html">treino de musculação</a> ou o <a href="treino_bicicleta_menu.html">treino de bicicleta</a>.',
        "sucesso"
      );
      return;
    }

    if (!this.#validarDados(dados)) {
      this.#mostrarMensagem(
        "Esse JSON não parece ser um plano de treino nem um backup válido — faltam campos como treinos, metadata ou distribuicaoSemanal.",
        "erro"
      );
      return;
    }

    TreinosStorage.definirDadosTreinos(dados);
    this.#prefetchVideosDaBiblioteca();
    this.#atualizarStatus();
    this.#mostrarMensagem(
      'Plano salvo! Já dá pra usar o <a href="treino_exercicios_menu.html">treino de musculação</a> ou o <a href="treino_bicicleta_menu.html">treino de bicicleta</a>.',
      "sucesso"
    );
  }

  #prefetchVideosDaBiblioteca() {
    carregarBiblioteca()
      .then((bibliotecaExercicios) => VideosTorrent.prefetchTodosOsVideos(bibliotecaExercicios))
      .catch(() => {
        // Sem conexão — a biblioteca ainda não deve ter sido cacheada pelo
        // service worker na primeira visita. O plano continua salvo normalmente.
      });
  }

  #aoBaixarBackup() {
    const backup = TreinosStorage.montarBackup();
    if (!backup.dadosTreinos) {
      this.#mostrarMensagem("Carregue o plano de treino antes de baixar um backup.", "erro");
      return;
    }

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `treinos-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

new ImportarDadosController().iniciar();

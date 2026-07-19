export class Cronometro {
  #segundosAcumulados = 0;
  #ultimoInicio = null;
  #rodando = false;
  #intervalId = null;
  #aoTick;

  constructor({ aoTick } = {}) {
    this.#aoTick = aoTick;
  }

  get rodando() {
    return this.#rodando;
  }

  segundos() {
    const emAndamento = this.#rodando ? Math.round((Date.now() - this.#ultimoInicio) / 1000) : 0;
    return this.#segundosAcumulados + emAndamento;
  }

  iniciar() {
    if (this.#rodando) return;
    this.#rodando = true;
    this.#ultimoInicio = Date.now();
    this.#pararIntervalo();
    this.#intervalId = setInterval(() => this.#aoTick?.(this.segundos()), 1000);
  }

  pausar() {
    if (!this.#rodando) return;
    this.#segundosAcumulados = this.segundos();
    this.#rodando = false;
    this.#pararIntervalo();
  }

  reiniciar() {
    this.pausar();
    this.#segundosAcumulados = 0;
  }

  #pararIntervalo() {
    if (this.#intervalId) {
      clearInterval(this.#intervalId);
      this.#intervalId = null;
    }
  }
}

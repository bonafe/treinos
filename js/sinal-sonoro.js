export class SinalSonoro {
  #audioCtx = null;

  #obterContexto() {
    if (!this.#audioCtx) {
      this.#audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.#audioCtx.state === "suspended") {
      this.#audioCtx.resume();
    }
    return this.#audioCtx;
  }

  // Precisa ser chamado a partir de um gesto do usuário (ex: clique) pra
  // destravar o AudioContext em navegadores que exigem interação prévia.
  destravar() {
    this.#obterContexto();
  }

  beep({ frequency = 880, duration = 0.22, type = "square", volume = 0.45 } = {}) {
    const ctx = this.#obterContexto();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration + 0.04);
  }

  vibrar(padrao) {
    if ("vibrate" in navigator) navigator.vibrate(padrao);
  }

  flashTela(classe = "flash", elemento = document.body) {
    elemento.classList.remove("flash", "flash-forte");
    void elemento.offsetWidth;
    elemento.classList.add(classe);
  }
}

import { Formatadores } from "./formatadores.js";

export class GraficoBarrasHistorico {
  constructor({ seletor, historico, campoData }) {
    this.seletor = seletor;
    this.historico = historico;
    this.campoData = campoData;
  }

  #agruparPorDia(dias) {
    const porDia = new Map();
    this.historico.forEach((s) => {
      const chave = Formatadores.chaveDataLocal(s[this.campoData]);
      porDia.set(chave, (porDia.get(chave) || 0) + s.duracaoSegundos);
    });

    const hoje = new Date();
    hoje.setHours(12, 0, 0, 0);
    const resultado = [];
    for (let i = dias - 1; i >= 0; i--) {
      const data = new Date(hoje);
      data.setDate(data.getDate() - i);
      const chave = Formatadores.chaveDataLocal(data.toISOString());
      resultado.push({ rotulo: Formatadores.dataCurta(data), totalSegundos: porDia.get(chave) || 0 });
    }
    return resultado;
  }

  #agruparPorMes(meses) {
    const porMes = new Map();
    this.historico.forEach((s) => {
      const chave = Formatadores.chaveMesLocal(s[this.campoData]);
      porMes.set(chave, (porMes.get(chave) || 0) + s.duracaoSegundos);
    });

    const hoje = new Date();
    const resultado = [];
    for (let i = meses - 1; i >= 0; i--) {
      const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const chave = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
      resultado.push({ rotulo: Formatadores.mesCurto(data), totalSegundos: porMes.get(chave) || 0 });
    }
    return resultado;
  }

  #montar(dados) {
    const W = 800;
    const H = 240;
    const margin = { top: 12, right: 12, bottom: 26, left: 42 };
    const plotW = W - margin.left - margin.right;
    const plotH = H - margin.top - margin.bottom;

    const x = d3.scaleBand()
      .domain(dados.map((d) => d.rotulo))
      .range([0, plotW])
      .padding(dados.length > 15 ? 0.3 : 0.45);

    const maxMin = d3.max(dados, (d) => d.totalSegundos / 60) || 1;
    const y = d3.scaleLinear()
      .domain([0, maxMin * 1.15])
      .range([plotH, 0]);

    const svg = d3.select(this.seletor);
    svg.selectAll("*").remove();

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    g.append("g")
      .call(d3.axisLeft(y).ticks(4).tickSize(-plotW).tickFormat(""))
      .call((sel) => sel.select(".domain").remove())
      .call((sel) => sel.selectAll("line").attr("stroke", "rgba(148,163,184,0.16)"));

    g.append("g")
      .call(d3.axisLeft(y).ticks(4).tickFormat((v) => Formatadores.minutos(v)))
      .call((sel) => sel.selectAll("text").attr("fill", "#94a3b8").attr("font-size", "11px"))
      .call((sel) => sel.selectAll("line,.domain").attr("stroke", "rgba(148,163,184,0.3)"));

    const passo = Math.max(1, Math.ceil(dados.length / 8));
    const ticksEixoX = x.domain().filter((_, i) => i % passo === 0);

    g.append("g")
      .attr("transform", `translate(0,${plotH})`)
      .call(d3.axisBottom(x).tickValues(ticksEixoX))
      .call((sel) => sel.selectAll("text").attr("fill", "#94a3b8").attr("font-size", "11px"))
      .call((sel) => sel.selectAll("line,.domain").attr("stroke", "rgba(148,163,184,0.3)"));

    const alturaBarra = (d) => Math.max(2, plotH - y(d.totalSegundos / 60));
    const topoBarra = (d) => plotH - alturaBarra(d);

    g.selectAll("rect.barra")
      .data(dados)
      .join("rect")
      .attr("class", "barra")
      .attr("x", (d) => x(d.rotulo))
      .attr("width", x.bandwidth())
      .attr("y", topoBarra)
      .attr("height", alturaBarra)
      .attr("rx", 3)
      .attr("fill", "#bef264")
      .append("title")
      .text((d) => `${d.rotulo} · ${d.totalSegundos > 0 ? Formatadores.minutos(d.totalSegundos / 60) : "sem treino"}`);

    // Rótulo direto só cabe com banda larga o bastante (poucos dias/meses);
    // em 30 dias as barras ficam finas demais e o valor vira tooltip só.
    if (x.bandwidth() >= 20) {
      g.selectAll("text.valor-barra")
        .data(dados.filter((d) => d.totalSegundos > 0))
        .join("text")
        .attr("class", "valor-barra")
        .attr("x", (d) => x(d.rotulo) + x.bandwidth() / 2)
        .attr("y", (d) => topoBarra(d) - 6)
        .attr("text-anchor", "middle")
        .attr("fill", "#e2e8f0")
        .attr("font-size", "10px")
        .attr("font-weight", "700")
        .text((d) => Formatadores.minutos(d.totalSegundos / 60));
    }
  }

  renderizar(periodo) {
    if (periodo === "7d") this.#montar(this.#agruparPorDia(7));
    else if (periodo === "30d") this.#montar(this.#agruparPorDia(30));
    else this.#montar(this.#agruparPorMes(6));
  }

  // Mostra a seção do gráfico (ou o estado vazio) e liga os botões de período.
  // secaoEl precisa conter os elementos .periodo-btn com data-periodo.
  inicializar(secaoEl, vazioEl) {
    if (!this.historico.length) {
      vazioEl.hidden = false;
      return;
    }

    secaoEl.hidden = false;
    let periodoAtual = "7d";
    this.renderizar(periodoAtual);

    secaoEl.querySelectorAll(".periodo-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.dataset.periodo === periodoAtual) return;
        periodoAtual = btn.dataset.periodo;
        secaoEl.querySelectorAll(".periodo-btn").forEach((b) => b.classList.toggle("active", b === btn));
        this.renderizar(periodoAtual);
      });
    });
  }
}

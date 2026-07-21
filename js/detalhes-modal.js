// Exercícios (bibliotecas.exercicios) e alongamentos (bibliotecas.alongamentos)
// têm o mesmo formato pros campos usados aqui (nome, descricao,
// gruposMusculares, equipamentos, execucao, restricoes — ver
// docs/especificacao-biblioteca-exercicios.md e
// docs/estrutura-biblioteca-alongamentos.md), então um único renderizador
// serve pros dois catálogos.

function resolverNomes(ids, catalogo) {
  return (ids || []).map((id) => (catalogo[id] && catalogo[id].nome) || id);
}

function montarSecaoGrupos(gruposDoItem, gruposMuscularesBiblioteca) {
  if (!gruposDoItem) return "";
  // `sinergistas` (exercícios) e `secundarios` (alongamentos) são o mesmo
  // conceito com nome de campo diferente entre os dois catálogos — mesma
  // situação já tratada em PrescricaoFormatadores.gruposMusculares.
  const secundarios = gruposDoItem.sinergistas || gruposDoItem.secundarios || [];
  const secoes = [
    { titulo: "Principais", ids: gruposDoItem.principais },
    { titulo: "Secundários", ids: secundarios },
    { titulo: "Estabilizadores", ids: gruposDoItem.estabilizadores }
  ];
  return secoes
    .filter((s) => s.ids && s.ids.length)
    .map((s) => `<p><strong>${s.titulo}:</strong> ${resolverNomes(s.ids, gruposMuscularesBiblioteca).join(", ")}</p>`)
    .join("");
}

function montarSecaoEquipamentos(equipamentos, equipamentosBiblioteca) {
  if (!equipamentos) return "";
  const nomeDe = (e) => {
    const id = typeof e === "string" ? e : e.equipamentoId;
    return (equipamentosBiblioteca[id] && equipamentosBiblioteca[id].nome) || id;
  };
  const partes = [];
  if (equipamentos.obrigatorios && equipamentos.obrigatorios.length) {
    partes.push(`<p><strong>Equipamento:</strong> ${equipamentos.obrigatorios.map(nomeDe).join(", ")}</p>`);
  }
  if (equipamentos.opcionais && equipamentos.opcionais.length) {
    partes.push(`<p><strong>Opcional:</strong> ${equipamentos.opcionais.map(nomeDe).join(", ")}</p>`);
  }
  return partes.join("");
}

function montarLista(titulo, itens) {
  if (!itens || !itens.length) return "";
  return `<p><strong>${titulo}:</strong></p><ul>${itens.map((i) => `<li>${i}</li>`).join("")}</ul>`;
}

function montarSecaoExecucao(execucao) {
  if (!execucao) return "";
  return [
    montarLista("Execução", execucao.instrucoes),
    execucao.respiracao ? `<p><strong>Respiração:</strong> ${execucao.respiracao}</p>` : "",
    montarLista("Erros comuns", execucao.errosComuns),
    montarLista("Cuidados", execucao.cuidados)
  ]
    .filter(Boolean)
    .join("");
}

function montarSecaoRestricoes(restricoes) {
  if (!restricoes || !restricoes.length) return "";
  return montarLista(
    "Atenção",
    restricoes.map((r) => r.orientacao || r.condicaoId)
  );
}

export function criarDetalhesModal() {
  const overlayEl = document.getElementById("detalhesOverlay");
  const nomeEl = document.getElementById("detalhesNome");
  const conteudoEl = document.getElementById("detalhesConteudo");
  const fecharEl = document.getElementById("detalhesFechar");

  function fechar() {
    overlayEl.hidden = true;
  }

  fecharEl.addEventListener("click", fechar);
  overlayEl.addEventListener("click", (evento) => {
    if (evento.target === overlayEl) fechar();
  });

  return {
    /**
     * `item` é uma entrada de `bibliotecas.exercicios` ou
     * `bibliotecas.alongamentos`; `bibliotecaExercicios` é o documento
     * inteiro da biblioteca (pra resolver nomes de grupo
     * muscular/equipamento).
     */
    abrir(item, bibliotecaExercicios) {
      nomeEl.textContent = item.nome;

      const partes = [
        item.descricao ? `<p>${item.descricao}</p>` : "",
        montarSecaoGrupos(item.gruposMusculares, bibliotecaExercicios.gruposMusculares),
        montarSecaoEquipamentos(item.equipamentos, bibliotecaExercicios.equipamentos),
        montarSecaoExecucao(item.execucao),
        montarSecaoRestricoes(item.restricoes)
      ].filter(Boolean);

      conteudoEl.innerHTML = partes.length
        ? partes.join("")
        : '<p class="detalhes-vazio">Nenhum detalhe cadastrado ainda.</p>';

      overlayEl.hidden = false;
    }
  };
}

"""Geração de imagem de exercício via API de imagens da OpenAI (gpt-image-1)."""

import base64
import re

GENEROS_VALIDOS = ("masculino", "feminino")

# `descricao` na biblioteca vem sempre estruturada assim (ver
# docs/especificacao-biblioteca-exercicios.md), o que encaixa direto nos
# dois quadros do prompt (início/fim) e resolve ambiguidades que o nome do
# equipamento sozinho não resolve — ex.: "banco reto" não diz se é deitado
# ou sentado, mas a descrição diz "deite no banco reto".
_PADRAO_DESCRICAO = re.compile(
    r"^Posição inicial:\s*(?P<inicial>.+?)\s*Movimento:\s*(?P<movimento>.+?)\s*Posição final:\s*(?P<final>.+)$",
    re.DOTALL,
)

# Personagem fixo por gênero — mesma pessoa em toda a coleção, pra manter
# consistência visual entre as imagens (ver seção 2.1 de
# docs/especificacao-biblioteca-exercicios.md).
_DESCRICAO_PERSONAGEM = {
    "feminino": (
        "Mulher adulta baseada na personagem feminina da fotografia de referência, com pele clara e "
        "aparência saudável e natural. Corpo de constituição mediana, proporcional e levemente atlético, "
        "sem definição muscular excessiva. Rosto oval e suavemente alongado, maçãs do rosto discretas, "
        "maxilar delicado, queixo arredondado, nariz reto de tamanho médio e lábios de volume médio. Olhos "
        "claros, levemente amendoados, sobrancelhas castanho-claras com curvatura natural. Cabelos "
        "castanho-claros a loiro-escuros, ondulados e cacheados, na altura dos ombros, parcialmente presos "
        "para trás durante os exercícios. Aparência adulta e madura, com textura de pele realista e sem "
        "rejuvenescimento artificial. Vestir regata esportiva vermelha, legging preta de cintura alta e "
        "tênis de treino neutros. Expressão concentrada, natural e cordial."
    ),
    "masculino": (
        "Homem adulto baseado no personagem masculino da fotografia de referência, com pele clara, "
        "estrutura corporal grande, larga e forte, aparência robusta e natural. Corpo proporcional, com "
        "ombros amplos, tórax volumoso, braços e pernas fortes, sem definição extrema de fisiculturista. "
        "Rosto quadrado a retangular, testa larga, maxilar robusto, nariz reto de tamanho médio a grande e "
        "sobrancelhas castanho-escuras, espessas e naturais. Olhos escuros e expressão segura e concentrada. "
        "Cabelos castanho-escuros, curtos, ondulados e cacheados, com volume moderado no topo e laterais "
        "mais curtas. Barba cheia, volumosa, bem cuidada e predominantemente grisalha, formada por fios "
        "brancos, cinza e alguns fios castanhos, com bigode cheio integrado à barba. Aparência adulta e "
        "madura, com textura de pele e linhas de expressão realistas. Vestir camiseta esportiva ajustada em "
        "tom verde-azulado, bermuda esportiva preta e tênis de treino neutros."
    ),
}

_INVARIANCIA_PERSONAGEM = (
    "A identidade visual do personagem deve permanecer invariável entre todas as imagens da coleção: não "
    "modificar formato do rosto, idade aparente, cor da pele, cor dos olhos, cabelo, barba (quando houver), "
    "constituição corporal, proporções, vestuário, penteado ou estilo fotográfico. Alterar somente a posição "
    "corporal, a expressão de esforço necessária, o equipamento e o enquadramento exigidos pelo exercício."
)


def humanizar_id(identificador: str) -> str:
    return identificador.replace("-", " ")


def montar_prompt(exercicio: dict, genero: str) -> str:
    """Monta o prompt de imagem a partir do nome, dos grupos musculares e da
    `descricao` do exercício na biblioteca, sempre com o mesmo personagem
    fixo (_DESCRICAO_PERSONAGEM) por gênero."""
    nome = exercicio.get("nome") or exercicio.get("id", "exercício")
    grupos = exercicio.get("gruposMusculares", {}).get("principais", [])
    descricao = exercicio.get("descricao") or ""
    etapas = _PADRAO_DESCRICAO.match(descricao)

    partes = [
        "Ilustração instrutiva de fitness, estilo flat/vetor.",
        f"Personagem: {_DESCRICAO_PERSONAGEM[genero]}",
        _INVARIANCIA_PERSONAGEM,
        f'Executando o exercício "{nome}" com a forma correta.'
    ]
    if grupos:
        partes.append(f"Ênfase visual nos músculos: {', '.join(humanizar_id(g) for g in grupos)}.")

    if etapas:
        partes.append(
            "Composição em dois quadros lado a lado, mesmo personagem, roupa e ângulo nos dois. "
            f"Quadro da esquerda, posição inicial: {etapas['inicial']} "
            f"Quadro da direita, posição final: {etapas['final']} "
            f"Movimento entre os dois quadros: {etapas['movimento']}"
        )
    else:
        if descricao:
            partes.append(f"Descrição da execução: {descricao}")
        partes.append(
            "Composição em dois quadros lado a lado, mesmo personagem, roupa e "
            "ângulo nos dois: o quadro da esquerda mostra a posição inicial do "
            "movimento, o da direita mostra a posição final (ou o ponto de maior "
            "amplitude) — juntas, as duas posições devem deixar claro o que "
            "precisa ser feito."
        )

    partes.append(
        "Fundo neutro e limpo, sem texto, sem marca d'água, corpo inteiro "
        "visível em cada quadro."
    )
    return " ".join(partes)


def gerar_imagem_exercicio(
    exercicio: dict,
    genero: str,
    *,
    tamanho: str = "1024x1024",
    qualidade: str = "auto",
    fundo: str = "auto",
    modelo: str,
    cliente,
) -> bytes:
    """Gera uma imagem para o exercício e devolve os bytes do arquivo
    (PNG). `cliente` é uma instância de `openai.OpenAI` já configurada com
    a chave de API — passada de fora pra essa função não precisar saber
    de onde a chave veio (facilita reusar/testar isolado)."""
    if genero not in GENEROS_VALIDOS:
        raise ValueError(f"genero inválido: {genero!r} (use 'masculino' ou 'feminino')")

    prompt = montar_prompt(exercicio, genero)

    resposta = cliente.images.generate(
        model=modelo,
        prompt=prompt,
        size=tamanho,
        quality=qualidade,
        background=fundo,
        n=1,
    )

    return base64.b64decode(resposta.data[0].b64_json)

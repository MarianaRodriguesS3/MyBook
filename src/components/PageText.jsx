import { useLayoutEffect, useRef } from "react";

const MIN_FONT_SIZE = 9;

// tamanho máximo permitido, por modo — pode
// ajustar esses valores conforme o layout
const MAX_FONT_SIZE_PORTRAIT = 40;
const MAX_FONT_SIZE_LANDSCAPE = 32;

function splitText(text) {
  if (!text)
    return [];

  return text
    .split(
      /(?<=[.!?])\s+/
    )
    .filter(
      item =>
        item.trim().length > 0
    );
}

/*
  Descobre em qual frase (índice em `sentences`)
  cai a posição `charIndex` do texto original da
  página. Como splitText só remove o espaço ENTRE
  frases (consumido pelo regex de split), cada
  item de `sentences` é uma substring exata do
  texto original — por isso dá pra localizar cada
  uma com indexOf, avançando o ponto de busca a
  cada frase pra não confundir frases repetidas.
*/
function locateSentenceIndex(text, sentences, charIndex) {
  if (!text || charIndex == null)
    return -1;

  let searchFrom = 0;

  for (let i = 0; i < sentences.length; i++) {

    const start = text.indexOf(sentences[i], searchFrom);

    if (start === -1)
      continue;

    const end = start + sentences[i].length;

    if (charIndex >= start && charIndex < end) {
      return i;
    }

    searchFrom = end;

  }

  return -1;
}

function PageText({
  text,
  activeSentence,
  mode,
  clickable,
  onSentenceClick,
  searchHighlight // { charIndex, length } | null — já filtrado para esta página
}) {

  const containerRef =
    useRef(null);

  const highlightRef =
    useRef(null);

  const sentences =
    splitText(text);

  const matchSentenceIndex =
    searchHighlight
      ? locateSentenceIndex(text, sentences, searchHighlight.charIndex)
      : -1;

  /*
    Ajusta o tamanho do texto para

    OCUPAR o espaço disponível — não

    só encolher quando não cabe, mas

    também crescer quando sobra espaço.

    Faz isso com busca binária: testa

    tamanhos entre MIN e MAX, procurando

    o MAIOR que ainda cabe (sem estourar

    a altura do container).
  */
  useLayoutEffect(() => {
    const el =
      containerRef.current;
    if (!el)
      return;

    const maxSize =
      mode === "portrait"
        ? MAX_FONT_SIZE_PORTRAIT
        : MAX_FONT_SIZE_LANDSCAPE;

    /*
      Busca em passos de 0.5px (por isso

      os limites e o "mid" são o dobro,

      depois dividimos por 2 na hora de

      aplicar). Isso reduz — mas não

      elimina — a sobra de espaço: o

      texto só quebra em número inteiro

      de linhas, então sempre pode sobrar

      até quase uma linha de altura.
    */
    function fitFontSize() {

      let low =
        MIN_FONT_SIZE * 2;

      let high =
        maxSize * 2;

      let best =
        MIN_FONT_SIZE * 2;

      while (low <= high) {

        const mid =
          Math.floor(
            (low + high) / 2
          );

        el.style.fontSize =
          `${mid / 2}px`;

        if (
          el.scrollHeight <= el.clientHeight
        ) {

          // esse tamanho coube — tenta um maior ainda
          best = mid;
          low = mid + 1;

        } else {

          // estourou — tenta um menor
          high = mid - 1;

        }

      }

      el.style.fontSize =
        `${best / 2}px`;

    }

    fitFontSize();

    /*
      Reajusta sempre que o CONTAINER mudar de tamanho,
      não só quando text/mode mudam — cobre casos que o
      useLayoutEffect sozinho não pega: rotacionar o
      celular, redimensionar a janela, ou a imagem da
      página terminar de carregar e sobrar menos espaço
      pro texto do que quando a fonte foi calculada.

      Como el tem height:100% (fixo pelo pai, não pelo
      próprio conteúdo), mudar o font-size aqui dentro
      não dispara o observer de novo sozinho — só reage
      a mudanças de tamanho vindas de fora.
    */
    let rafId = null;

    const resizeObserver = new ResizeObserver(() => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(fitFontSize);
    });

    resizeObserver.observe(el);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
    };

  }, [
    text,
    mode
  ]);

  /*
    Rola até a frase com a ocorrência da
    busca sempre que ela mudar (nova busca
    selecionada, ou troca de página que traz
    uma nova ocorrência destacada).
  */
  useLayoutEffect(() => {

    if (
      matchSentenceIndex !== -1 &&
      highlightRef.current
    ) {

      highlightRef.current.scrollIntoView({
        block: "center",
        behavior: "smooth"
      });

    }

  }, [
    matchSentenceIndex,
    searchHighlight
  ]);

  if (!text) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="page-text"
    >
      {
        sentences.map(
          (sentence, index) => {

            const isSearchMatch =
              index === matchSentenceIndex;

            return (
              <span
                key={index}
                ref={
                  isSearchMatch
                    ? highlightRef
                    : null
                }
                className={
                  (index === activeSentence ? "sentence active" : "sentence") +
                  (isSearchMatch ? " sentence-search-match" : "") +
                  (clickable ? " sentence-clickable" : "")
                }
                onClick={
                  clickable
                    ? () => onSentenceClick(index)
                    : undefined
                }
              >
                {sentence}{" "}
              </span>
            );

          }
        )
      }
    </div>
  );
}

export default PageText;
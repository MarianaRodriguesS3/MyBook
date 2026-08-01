import { useLayoutEffect, useRef } from "react";

const MIN_FONT_SIZE = 9;
const MAX_FONT_SIZE_PORTRAIT = 34;
const MAX_FONT_SIZE_LANDSCAPE = 30;

// 🟢 Exportada para ser reaproveitada no SpeechControl.jsx
export function splitText(text) {
  if (!text) return [];

  const paragraphs = text.split(/\n{2,}/);
  const sentences = [];

  for (const rawParagraph of paragraphs) {
    const trimmed = rawParagraph.trim();
    if (!trimmed) continue;

    const isHeading = trimmed.startsWith("@@") && trimmed.endsWith("@@");

    if (isHeading) {
      const clean = trimmed.slice(2, -2).trim();
      if (clean) sentences.push(clean);
      continue;
    }

    // Dividir por pontuação de fim de frase (. ! ?)
    const parts = trimmed
      .split(/(?<=[.!?])\s+/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    sentences.push(...parts);
  }

  return sentences;
}

function locateSentenceIndex(text, sentences, charIndex) {
  if (!text || charIndex == null) return -1;

  let searchFrom = 0;

  for (let i = 0; i < sentences.length; i++) {
    const cleanSentence = sentences[i].replace(/\*\*/g, "");
    const start = text.indexOf(cleanSentence, searchFrom);

    if (start === -1) continue;
    const end = start + cleanSentence.length;

    if (charIndex >= start && charIndex < end) {
      return i;
    }
    searchFrom = end;
  }
  return -1;
}

function renderInlineFormatting(str) {
  const parts = str.split(/(\*\*.*?\*\*)/g);

  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

function buildParagraphBlocks(text) {
  if (!text) return [];

  const rawParagraphs = text.split(/\n+/);
  const blocks = [];
  let globalSentenceIndex = 0;

  for (const rawPara of rawParagraphs) {
    const trimmed = rawPara.trim();
    if (!trimmed) continue;

    const isHeading = trimmed.startsWith("@@") && trimmed.endsWith("@@");
    const cleanText = isHeading ? trimmed.slice(2, -2).trim() : trimmed;

    if (!cleanText) continue;

    const blockIndices = [];

    if (isHeading) {
      blockIndices.push(globalSentenceIndex);
      globalSentenceIndex++;
    } else {
      const sentencesInPara = cleanText
        .split(/(?<=[.!?])\s+/)
        .map((item) => item.trim())
        .filter((item) => item.length > 0);

      for (let i = 0; i < sentencesInPara.length; i++) {
        blockIndices.push(globalSentenceIndex);
        globalSentenceIndex++;
      }
    }

    blocks.push({
      isHeading,
      indices: blockIndices,
    });
  }

  return blocks;
}

function PageText({
  text,
  images,
  blocks,
  activeSentence,
  mode,
  clickable,
  onSentenceClick,
  searchHighlight,
}) {
  const containerRef = useRef(null);
  const highlightRef = useRef(null);
  const sentences = splitText(text);
  const paragraphBlocks = buildParagraphBlocks(text);

  const matchSentenceIndex = searchHighlight
    ? locateSentenceIndex(text, sentences, searchHighlight.charIndex)
    : -1;

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const maxSize =
      mode === "portrait" ? MAX_FONT_SIZE_PORTRAIT : MAX_FONT_SIZE_LANDSCAPE;

    function fitFontSize() {
      let low = MIN_FONT_SIZE * 2;
      let high = maxSize * 2;
      let best = MIN_FONT_SIZE * 2;

      el.style.lineHeight = "1.35";

      const imageElements = el.querySelectorAll("img");
      let imagesHeight = 0;
      imageElements.forEach((img) => {
        imagesHeight += img.getBoundingClientRect().height;
      });

      while (low <= high) {
        const mid = Math.floor((low + high) / 2);

        el.style.fontSize = `${mid / 2}px`;

        const textOverflow = el.scrollHeight - imagesHeight;
        const availableForText = el.clientHeight - imagesHeight;

        if (textOverflow <= availableForText) {
          best = mid;
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }

      el.style.fontSize = `${best / 2}px`;
    }

    fitFontSize();

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
  }, [text, mode, images, blocks]);

  useLayoutEffect(() => {
    if (matchSentenceIndex !== -1 && highlightRef.current) {
      highlightRef.current.scrollIntoView({
        block: "center",
        behavior: "smooth",
      });
    }
  }, [matchSentenceIndex, searchHighlight]);

  if (!text && (!images || !images.length)) {
    return null;
  }

  function renderParagraph(block, key, paragraphIndex) {
    const Wrapper = block.isHeading ? "div" : "p";
    const className = block.isHeading ? "page-heading" : "page-paragraph";

    return (
      <Wrapper key={key} className={className}>
        {block.indices.map((index) => {
          const sentence = sentences[index];
          if (!sentence) return null;

          const isSearchMatch = index === matchSentenceIndex;
          // activeSentence é índice de parágrafo (vindo do SpeechControl)
          const isActiveParagraph =
            activeSentence != null &&
            activeSentence === paragraphIndex;

          return (
            <span
              key={index}
              ref={isSearchMatch ? highlightRef : null}
              className={
                (isActiveParagraph ? "sentence active" : "sentence") +
                (isSearchMatch ? " sentence-search-match" : "") +
                (clickable ? " sentence-clickable" : "")
              }
              onClick={clickable ? () => onSentenceClick(index) : undefined}
            >
              {renderInlineFormatting(sentence)}{" "}
            </span>
          );
        })}
      </Wrapper>
    );
  }

  const orderedBlocks =
    blocks && blocks.length
      ? blocks
      : [
          ...(images || []).map((src) => ({ type: "image", src })),
          ...paragraphBlocks.map(() => ({ type: "text" })),
        ];

  let paragraphCursor = 0;

  const content = orderedBlocks.map((entry, i) => {
    if (entry.type === "image") {
      return (
        <img key={`img-${i}`} src={entry.src} alt="" className="page-image" />
      );
    }

    const block = paragraphBlocks[paragraphCursor];
    const paragraphIndex = paragraphCursor;
    paragraphCursor++;

    if (!block) return null;

    return renderParagraph(block, `p-${i}`, paragraphIndex);
  });

  return (
    <div ref={containerRef} className="page-text">
      {content}
    </div>
  );
}

export default PageText;

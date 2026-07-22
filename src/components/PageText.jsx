import { useLayoutEffect, useRef } from "react";

const MIN_FONT_SIZE = 9;
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
  searchHighlight
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

  useLayoutEffect(() => {
    const el =
      containerRef.current;
    if (!el)
      return;

    const maxSize =
      mode === "portrait"
        ? MAX_FONT_SIZE_PORTRAIT
        : MAX_FONT_SIZE_LANDSCAPE;

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

        best = mid;
        low = mid + 1;

      } else {
        high = mid - 1;
      }
    }

    el.style.fontSize =
      `${best / 2}px`;

  }, [
    text,
    mode
  ]);

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
                ref={isSearchMatch ? highlightRef : null}
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
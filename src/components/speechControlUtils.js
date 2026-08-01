/**
 * Divide o texto em sentenças para o TTS falar uma a uma.
 * Usa a mesma lógica do PageText.splitText para que os índices coincidam.
 */
export function splitIntoSentences(text) {
  if (!text) return [];

  const result = [];

  for (const rawLine of text.split(/\n+/)) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("@@") && trimmed.endsWith("@@")) {
      const clean = trimmed.slice(2, -2).trim();
      if (clean) result.push(clean);
      continue;
    }

    const parts = trimmed
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);

    result.push(...parts);
  }

  return result;
}

/**
 * Dado um índice de sentença global, retorna o índice do parágrafo
 * (bloco de linha) que contém aquela sentença.
 * Usado para sincronizar o highlight do PageText com o TTS.
 */
export function getParagraphIndexForSentenceIndex(text, sentenceIndex) {
  if (!text || sentenceIndex == null || sentenceIndex < 0) return 0;

  const rawLines = text.split(/\n+/);
  let globalSentenceIdx = 0;
  let paragraphCursor = 0;

  for (const rawLine of rawLines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    const isHeading = trimmed.startsWith("@@") && trimmed.endsWith("@@");
    const cleanText = isHeading ? trimmed.slice(2, -2).trim() : trimmed;
    if (!cleanText) continue;

    const count = isHeading
      ? 1
      : cleanText.split(/(?<=[.!?])\s+/).filter(Boolean).length;

    if (sentenceIndex >= globalSentenceIdx && sentenceIndex < globalSentenceIdx + count) {
      return paragraphCursor;
    }

    globalSentenceIdx += count;
    paragraphCursor++;
  }

  return Math.max(0, paragraphCursor - 1);
}

export function buildParagraphBlocks(text) {
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
      globalSentenceIndex += 1;
    } else {
      const sentencesInPara = cleanText
        .split(/(?<=[.!?])\s+/)
        .map((item) => item.trim())
        .filter((item) => item.length > 0);

      for (let i = 0; i < sentencesInPara.length; i += 1) {
        blockIndices.push(globalSentenceIndex);
        globalSentenceIndex += 1;
      }
    }

    blocks.push({
      isHeading,
      indices: blockIndices,
    });
  }

  return blocks;
}

export function getParagraphIndexForSentenceIndex(text, sentenceIndex) {
  if (!text || sentenceIndex == null || sentenceIndex < 0) {
    return 0;
  }

  const blocks = buildParagraphBlocks(text);

  for (let paragraphIndex = 0; paragraphIndex < blocks.length; paragraphIndex += 1) {
    if (blocks[paragraphIndex].indices.includes(sentenceIndex)) {
      return paragraphIndex;
    }
  }

  return 0;
}

import * as pdfjsLib from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

const RENDER_SCALE = 2;

export async function loadPdfDocument(file) {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });

  return loadingTask.promise;
}

export async function extractPageContent(pdfDoc, pageNumber) {
  const page = await pdfDoc.getPage(pageNumber);
  const textContent = await page.getTextContent({
    disableCombineTextItems: true,
    includeMarkedContent: true,
  });

  const { text, paragraphStarts } = processTextItems(textContent.items);

  let images = [];
  let blocks = [];

  try {
    const viewport = page.getViewport({ scale: RENDER_SCALE });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const ctx = canvas.getContext("2d");

    await page.render({
      canvasContext: ctx,
      viewport,
    }).promise;

    const operatorList = await page.getOperatorList();

    const extractedImages = extractImagesFromCanvas(
      canvas,
      viewport,
      operatorList,
    );
    images = extractedImages.map((img) => img.src);

    const paragraphMarkers = paragraphStarts.map((p) => {
      const [, vy] = viewport.convertToViewportPoint(p.x, p.y);
      return { type: "text", y: vy };
    });

    const imageMarkers = extractedImages.map((img) => ({
      type: "image",
      y: img.y,
      src: img.src,
    }));

    blocks = [...paragraphMarkers, ...imageMarkers].sort((a, b) => a.y - b.y);
  } catch (err) {
    console.warn(
      `Falha ao renderizar/extrair imagens da página ${pageNumber}:`,
      err,
    );
  }

  return {
    text,
    images,
    blocks,
  };
}

export async function renderPageThumbnail(
  pdfDoc,
  pageNumber = 1,
  targetWidth = 200,
) {
  const page = await pdfDoc.getPage(pageNumber);
  const baseViewport = page.getViewport({ scale: 1 });
  const scale = targetWidth / baseViewport.width;
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");

  canvas.width = viewport.width;
  canvas.height = viewport.height;

  const ctx = canvas.getContext("2d");

  await page.render({
    canvasContext: ctx,
    viewport,
  }).promise;

  return canvas.toDataURL("image/jpeg", 0.7);
}

function processTextItems(items) {
  if (!items?.length) return { text: "", paragraphStarts: [] };

  const validItems = items.filter((item) => item.str && item.str.trim() !== "");
  if (!validItems.length) return { text: "", paragraphStarts: [] };

  validItems.sort((a, b) => {
    const yDiff = b.transform[5] - a.transform[5];
    if (Math.abs(yDiff) > 2) return yDiff;
    return a.transform[4] - b.transform[4];
  });

  function fontSizeOf(item) {
    return Math.abs(item.transform[3]) || Math.abs(item.transform[0]) || 10;
  }

  // --- Passo 1: agrupar itens em linhas (por proximidade vertical) ---
  const lines = [];
  let currentLine = null;

  for (const item of validItems) {
    const y = item.transform[5];
    const fontSize = fontSizeOf(item);

    if (
      currentLine &&
      Math.abs(currentLine.y - y) <=
        Math.max(fontSize, currentLine.fontSize) * 0.4
    ) {
      currentLine.items.push(item);
      currentLine.fontSize = Math.max(currentLine.fontSize, fontSize);
    } else {
      currentLine = { y, fontSize, x: item.transform[4], items: [item] };
      lines.push(currentLine);
    }
  }

  if (!lines.length) return { text: "", paragraphStarts: [] };

  // --- Passo 2: margem esquerda "padrão" (moda dos x de início de linha) ---
  const xCounts = new Map();
  for (const line of lines) {
    const roundedX = Math.round(line.x);
    xCounts.set(roundedX, (xCounts.get(roundedX) || 0) + 1);
  }

  let bodyLeftMargin = lines[0].x;
  let bestXCount = 0;
  for (const [x, count] of xCounts) {
    if (count > bestXCount) {
      bestXCount = count;
      bodyLeftMargin = x;
    }
  }

  // --- Passo 2b: tamanho de fonte "padrão" do corpo (moda arredondada) ---
  const sizeCounts = new Map();
  for (const line of lines) {
    const roundedSize = Math.round(line.fontSize);
    sizeCounts.set(roundedSize, (sizeCounts.get(roundedSize) || 0) + 1);
  }

  let bodyFontSize = lines[0].fontSize;
  let bestSizeCount = 0;
  for (const [size, count] of sizeCounts) {
    if (count > bestSizeCount) {
      bestSizeCount = count;
      bodyFontSize = size;
    }
  }

  // --- Passo 2c: fonte "padrão" do corpo (moda do fontName da linha) ---
  const fontCounts = new Map();
  for (const line of lines) {
    const lineFontName = (line.items[0]?.fontName || "").toLowerCase();
    fontCounts.set(lineFontName, (fontCounts.get(lineFontName) || 0) + 1);
  }

  let bodyFontName = lines[0].items[0]?.fontName?.toLowerCase() || "";
  let bestFontCount = 0;
  for (const [fontName, count] of fontCounts) {
    if (count > bestFontCount) {
      bestFontCount = count;
      bodyFontName = fontName;
    }
  }

  const HEADING_SIZE_RATIO = 1.1;
  const TITLE_BLOCK_MAX_LINES = 3;
  const TITLE_LINE_MAX_WORDS = 6;

  // --- Passo 3: montar o texto ---
  let result = "";
  let previousLine = null;
  let previousWasHeading = false;
  let titleBlockActive = false;
  let titleBlockCount = 0;
  const paragraphStarts = [];

  for (const line of lines) {
    const isBigFont = line.fontSize > bodyFontSize * HEADING_SIZE_RATIO;

    const isFullyBold = line.items.every((item) => {
      const fontName = (item.fontName || "").toLowerCase();
      return (
        fontName.includes("bold") ||
        fontName.includes("black") ||
        fontName.includes("heavy") ||
        fontName.includes("semibold") ||
        fontName.includes("demi")
      );
    });

    const lineFontName = (line.items[0]?.fontName || "").toLowerCase();
    const isDifferentFont = lineFontName !== bodyFontName;

    const rawLineText = line.items
      .map((item) => item.str)
      .join(" ")
      .trim();
    const lineWordCount = rawLineText.split(/\s+/).filter(Boolean).length;
    const isShortLine =
      lineWordCount > 0 && lineWordCount <= TITLE_LINE_MAX_WORDS;
    const isShortSpecial = (isFullyBold || isDifferentFont) && isShortLine;

    const isNumericLine = /^\d+$/.test(rawLineText);
    const isStrongHeading = isBigFont || isShortSpecial;
    const endsWithPunctuation = /[.!?]$/.test(rawLineText);

    let isHeading;

    if (isNumericLine && isStrongHeading) {
      isHeading = true;
      titleBlockActive = true;
      titleBlockCount = 1;
    } else if (
      titleBlockActive &&
      titleBlockCount < TITLE_BLOCK_MAX_LINES &&
      isShortLine &&
      !endsWithPunctuation
    ) {
      isHeading = true;
      titleBlockCount++;
    } else {
      isHeading = isStrongHeading;
      titleBlockActive = false;
      titleBlockCount = 0;
    }

    const indent = line.x - bodyLeftMargin;
    const isIndented = indent > line.fontSize * 0.8;

    const isNewParagraph =
      !previousLine || isHeading || previousWasHeading || isIndented;

    if (isNewParagraph) {
      paragraphStarts.push({ x: line.x, y: line.y });
    }

    if (previousLine) {
      if (isNewParagraph) {
        if (!result.endsWith("\n")) result += "\n\n";
      } else {
        if (result.endsWith("-")) {
          result = result.slice(0, -1);
        } else if (!result.endsWith(" ") && !result.endsWith("\n")) {
          result += " ";
        }
      }
    }

    let lineText = "";
    let previousItem = null;

    for (const item of line.items) {
      let text = item.str;

      const fontName = (item.fontName || "").toLowerCase();
      const isBold =
        fontName.includes("bold") ||
        fontName.includes("black") ||
        fontName.includes("heavy") ||
        fontName.includes("semibold") ||
        fontName.includes("demi");

      if (isBold && !isHeading) text = `**${text}**`;

      if (previousItem) {
        const previousEnd =
          previousItem.transform[4] + (previousItem.width || 0);
        const currentStart = item.transform[4];
        const xGap = currentStart - previousEnd;
        const fontSize = fontSizeOf(item);
        const wordSpaceThreshold = fontSize * 0.18;
        const currentClean = text.replace(/\*/g, "").trimStart();

        if (
          xGap > wordSpaceThreshold &&
          !lineText.endsWith(" ") &&
          !/^[.,;:!?]/.test(currentClean)
        ) {
          lineText += " ";
        }
      }

      lineText += text;
      previousItem = item;
    }

    result += isHeading ? `@@${lineText.trim()}@@` : lineText;

    previousLine = line;
    previousWasHeading = isHeading;
  }

  const cleanText = result
    .replace(/\*\*\s*\*\*/g, "")
    .replace(/\*\*\*\*/g, "")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/[ \t]+/g, " ")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { text: cleanText, paragraphStarts };
}

function extractImagesFromCanvas(canvas, viewport, operatorList) {
  const images = [];
  const stack = [];

  let ctm = viewport.transform;

  const { fnArray, argsArray } = operatorList;

  for (let i = 0; i < fnArray.length; i++) {
    const fn = fnArray[i];

    if (fn === pdfjsLib.OPS.save) {
      stack.push(ctm);
      continue;
    }

    if (fn === pdfjsLib.OPS.restore) {
      ctm = stack.pop() || viewport.transform;
      continue;
    }

    if (fn === pdfjsLib.OPS.transform) {
      const m = argsArray[i];
      ctm = composeMatrix(m, ctm);
      continue;
    }

    const isImage =
      fn === pdfjsLib.OPS.paintImageXObject ||
      fn === pdfjsLib.OPS.paintJpegXObject;

    if (!isImage) continue;

    try {
      const cropped = cropImageFromCtm(canvas, ctm);

      if (cropped) {
        images.push(cropped);
      }
    } catch (err) {
      console.warn("Falha ao recortar imagem da página:", err);
    }
  }

  return images;
}

function composeMatrix(m1, m2) {
  return [
    m1[0] * m2[0] + m1[1] * m2[2],
    m1[0] * m2[1] + m1[1] * m2[3],

    m1[2] * m2[0] + m1[3] * m2[2],
    m1[2] * m2[1] + m1[3] * m2[3],

    m1[4] * m2[0] + m1[5] * m2[2] + m2[4],
    m1[4] * m2[1] + m1[5] * m2[3] + m2[5],
  ];
}

function applyMatrix(point, matrix) {
  const [x, y] = point;

  return [
    x * matrix[0] + y * matrix[2] + matrix[4],
    x * matrix[1] + y * matrix[3] + matrix[5],
  ];
}

function cropImageFromCtm(canvas, ctm) {
  const corners = [
    applyMatrix([0, 0], ctm),
    applyMatrix([1, 0], ctm),
    applyMatrix([0, 1], ctm),
    applyMatrix([1, 1], ctm),
  ];

  const xs = corners.map((p) => p[0]);
  const ys = corners.map((p) => p[1]);
  const minX = Math.max(0, Math.floor(Math.min(...xs)));
  const maxX = Math.min(canvas.width, Math.ceil(Math.max(...xs)));
  const minY = Math.max(0, Math.floor(Math.min(...ys)));
  const maxY = Math.min(canvas.height, Math.ceil(Math.max(...ys)));
  const width = maxX - minX;
  const height = maxY - minY;

  if (width <= 0 || height <= 0) {
    return null;
  }

  const cropCanvas = document.createElement("canvas");

  cropCanvas.width = width;
  cropCanvas.height = height;

  const ctx = cropCanvas.getContext("2d");

  ctx.drawImage(canvas, minX, minY, width, height, 0, 0, width, height);

  return { src: cropCanvas.toDataURL("image/png"), y: minY };
}

export async function getParagraphDebugData(pdfDoc, pageNumber, scale = 1.5) {
  const page = await pdfDoc.getPage(pageNumber);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext("2d");
  await page.render({ canvasContext: ctx, viewport }).promise;

  const textContent = await page.getTextContent({
    disableCombineTextItems: true,
    includeMarkedContent: true,
  });

  const validItems = textContent.items.filter(
    (item) => item.str && item.str.trim() !== "",
  );

  validItems.sort((a, b) => {
    const yDiff = b.transform[5] - a.transform[5];
    if (Math.abs(yDiff) > 2) return yDiff;
    return a.transform[4] - b.transform[4];
  });

  function fontSizeOf(item) {
    return Math.abs(item.transform[3]) || Math.abs(item.transform[0]) || 10;
  }

  // --- Passo 1: agrupar itens em linhas (mesma lógica de processTextItems) ---
  const lines = [];
  let currentLine = null;

  for (const item of validItems) {
    const y = item.transform[5];
    const fontSize = fontSizeOf(item);

    if (
      currentLine &&
      Math.abs(currentLine.y - y) <=
        Math.max(fontSize, currentLine.fontSize) * 0.4
    ) {
      currentLine.items.push(item);
    } else {
      currentLine = { y, fontSize, x: item.transform[4], items: [item] };
      lines.push(currentLine);
    }
  }

  if (!lines.length) {
    return {
      imageDataUrl: canvas.toDataURL("image/png"),
      width: viewport.width,
      height: viewport.height,
      breaks: [],
    };
  }

  // --- Passo 2: moda da margem esquerda (mesma lógica de processTextItems) ---
  const xCounts = new Map();
  for (const line of lines) {
    const roundedX = Math.round(line.x);
    xCounts.set(roundedX, (xCounts.get(roundedX) || 0) + 1);
  }

  let bodyLeftMargin = lines[0].x;
  let bestCount = 0;
  for (const [x, count] of xCounts) {
    if (count > bestCount) {
      bestCount = count;
      bodyLeftMargin = x;
    }
  }

  // --- Passo 3: classificar cada linha (mesmos limiares de processTextItems) ---
  const breaks = [];
  let previousLine = null;

  for (const line of lines) {
    if (previousLine) {
      const indent = line.x - bodyLeftMargin;
      const isIndented = indent > line.fontSize * 0.8;

      const yGap = Math.abs(previousLine.y - line.y);
      const lineHeight = Math.max(line.fontSize, previousLine.fontSize);
      const isBigVerticalGap = yGap > lineHeight * 1.8;

      const isParagraphBreak = isIndented || isBigVerticalGap;

      const [vx, vy] = viewport.convertToViewportPoint(line.x, line.y);

      breaks.push({
        type: isParagraphBreak ? "paragraph" : "line",
        y: vy,
        preview: line.items[0]?.str.slice(0, 24) || "",
      });
    }

    previousLine = line;
  }

  return {
    imageDataUrl: canvas.toDataURL("image/png"),
    width: viewport.width,
    height: viewport.height,
    breaks,
  };
}

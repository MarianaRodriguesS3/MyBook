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

  const text = processTextItems(textContent.items);

  let images = [];

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

    images = extractImagesFromCanvas(canvas, viewport, operatorList);
  } catch (err) {
    console.warn(
      `Falha ao renderizar/extrair imagens da página ${pageNumber}:`,
      err,
    );
  }

  return {
    text,
    images,
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
  if (!items?.length) return "";

  const validItems = items.filter((item) => item.str && item.str.trim() !== "");
  if (!validItems.length) return "";

  validItems.sort((a, b) => {
    const yDiff = b.transform[5] - a.transform[5];
    if (Math.abs(yDiff) > 2) return yDiff;
    return a.transform[4] - b.transform[4];
  });

  let result = "";
  let previousItem = null;

  for (const item of validItems) {
    let text = item.str;

    const fontName = (item.fontName || "").toLowerCase();
    const isBold =
      fontName.includes("bold") ||
      fontName.includes("black") ||
      fontName.includes("heavy") ||
      fontName.includes("semibold") ||
      fontName.includes("demi");

    if (isBold) {
      text = `**${text}**`;
    }

    if (previousItem) {
      const prevY = previousItem.transform[5];
      const currY = item.transform[5];
      const yGap = Math.abs(prevY - currY);
      const cleanResult = result.replace(/\*/g, "").trimEnd();
      const endsWithSentenceEnd = /[.!?:]$/.test(cleanResult);

      if (yGap > 6) {
        if (endsWithSentenceEnd) {
          if (!result.endsWith("\n")) {
            result += "\n\n";
          }
        } else {
          if (result.endsWith("-")) {
            result = result.slice(0, -1);
          } else if (!result.endsWith(" ") && !result.endsWith("\n")) {
            result += " ";
          }
        }
      } else {
        const previousEnd =
          previousItem.transform[4] + (previousItem.width || 0);
        const currentStart = item.transform[4];
        const xGap = currentStart - previousEnd;

        const currentClean = text.replace(/\*/g, "").trimStart();

        if (
          xGap > 1.5 &&
          !result.endsWith(" ") &&
          !result.endsWith("\n") &&
          !/^[.,;:!?]/.test(currentClean)
        ) {
          result += " ";
        }
      }
    }

    result += text;
    previousItem = item;
  }

  return result
    .replace(/\*\*\s*\*\*/g, "")
    .replace(/\*\*\*\*/g, "")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/[ \t]+/g, " ")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
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

  return cropCanvas.toDataURL("image/png");
}

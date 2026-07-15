import * as pdfjsLib from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

export async function loadPdfDocument(file) {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });

  return loadingTask.promise;
}

export async function extractPageContent(pdfDoc, pageNumber) {
  const page = await pdfDoc.getPage(pageNumber);
  const textContent = await page.getTextContent();
  const text = textContent.items
    .map((item) => item.str)
    .join(" ");
  const images = await extractPageImages(page);

  return { text, images };
}

export async function renderPageThumbnail(pdfDoc, pageNumber = 1, targetWidth = 200) {
  const page = await pdfDoc.getPage(pageNumber);
  const baseViewport = page.getViewport({ scale: 1 });
  const scale = targetWidth / baseViewport.width;
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");

  canvas.width = viewport.width;
  canvas.height = viewport.height;

  const ctx = canvas.getContext("2d");

  await page.render({ canvasContext: ctx, viewport }).promise;

  return canvas.toDataURL("image/jpeg", 0.7);
}

async function extractPageImages(page) {
  const operatorList = await page.getOperatorList();
  const images = [];

  for (let i = 0; i < operatorList.fnArray.length; i++) {
    const fn = operatorList.fnArray[i];
    const isImage =
      fn === pdfjsLib.OPS.paintImageXObject ||
      fn === pdfjsLib.OPS.paintJpegXObject;

    if (!isImage) continue;

    const imageName = operatorList.argsArray[i][0];

    try {
      const imgData = await getImageDataUrl(page, imageName);
      if (imgData) images.push(imgData);
    } catch (err) {
      console.warn("Falha ao extrair imagem:", imageName, err);
    }
  }
  return images;
}

function getImageDataUrl(page, imageName) {
  return new Promise((resolve) => {

    page.objs.get(imageName, (img) => {

      if (!img || !img.width || !img.height) {
        resolve(null);
        return;
      }

      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext("2d");

      if (img.bitmap) {
        ctx.drawImage(img.bitmap, 0, 0);
        resolve(canvas.toDataURL());
        return;
      }

      if (!img.data) {
        resolve(null);
        return;
      }

      const imageData = ctx.createImageData(img.width, img.height);
      const pixelCount = img.width * img.height;

      if (img.data.length === pixelCount * 4) {

        imageData.data.set(img.data);

      } else if (img.data.length === pixelCount * 3) {

        for (let i = 0, j = 0; i < img.data.length; i += 3, j += 4) {
          imageData.data[j] = img.data[i];
          imageData.data[j + 1] = img.data[i + 1];
          imageData.data[j + 2] = img.data[i + 2];
          imageData.data[j + 3] = 255;
        }

      } else if (img.data.length === pixelCount) {

        for (let i = 0, j = 0; i < img.data.length; i += 1, j += 4) {
          imageData.data[j] = img.data[i];
          imageData.data[j + 1] = img.data[i];
          imageData.data[j + 2] = img.data[i];
          imageData.data[j + 3] = 255;
        }

      } else {
        resolve(null);
        return;

      }
      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL());
    });
  });
}
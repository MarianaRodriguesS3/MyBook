import * as pdfjsLib from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

// escala do render usado pra recortar as imagens —
// maior = imagens recortadas com mais qualidade,
// mas carregamento de página mais pesado
const RENDER_SCALE = 2;

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

  let images = [];

  try {

    const viewport =
      page.getViewport({ scale: RENDER_SCALE });

    const canvas =
      document.createElement("canvas");

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const ctx =
      canvas.getContext("2d");

    await page.render({
      canvasContext: ctx,
      viewport
    }).promise;

    const operatorList =
      await page.getOperatorList();

    images =
      extractImagesFromCanvas(
        canvas,
        viewport,
        operatorList
      );

  } catch (err) {

    /*
      Se o render ou a extração falharem por
      qualquer motivo, a página não pode ficar
      travada — segue sem imagens, só com o
      texto (que já foi extraído acima).
    */

    console.warn(
      `Falha ao renderizar/extrair imagens da página ${pageNumber}:`,
      err
    );

  }

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



/*
  Em vez de pedir pro pdf.js decodificar cada

  imagem individualmente via page.objs.get

  (que pode nunca resolver pra certos tipos de

  objeto — ex: camadas opcionais ocultas), a

  gente já tem a página inteira renderizada

  num canvas. Só precisamos descobrir ONDE

  cada imagem foi desenhada nele — refazendo

  manualmente a matriz de transformação (CTM)

  conforme percorremos a lista de operadores,

  do mesmo jeito que o pdf.js faz internamente

  — e então recortamos esse retângulo do canvas

  já pronto. Isso é 100% síncrono: sem callback,

  sem espera, sem chance de travar.

  Limitação: acompanha save/restore/transform

  no nível principal da página. Imagens dentro

  de Form XObjects aninhados com matriz própria

  podem sair com recorte impreciso — mas nunca

  travado.
*/

function extractImagesFromCanvas(canvas, viewport, operatorList){


  const images = [];


  const stack = [];


  let ctm =
    viewport.transform;



  const { fnArray, argsArray } =
    operatorList;



  for(let i = 0; i < fnArray.length; i++){


    const fn =
      fnArray[i];



    if(fn === pdfjsLib.OPS.save){

      stack.push(ctm);

      continue;

    }



    if(fn === pdfjsLib.OPS.restore){

      ctm =
        stack.pop() || viewport.transform;

      continue;

    }



    if(fn === pdfjsLib.OPS.transform){

      const m =
        argsArray[i];

      ctm =
        composeMatrix(m, ctm);

      continue;

    }



    const isImage =
      fn === pdfjsLib.OPS.paintImageXObject ||
      fn === pdfjsLib.OPS.paintJpegXObject;



    if(!isImage) continue;



    try{

      const cropped =
        cropImageFromCtm(
          canvas,
          ctm
        );

      if(cropped) images.push(cropped);

    }catch(err){

      console.warn(
        "Falha ao recortar imagem da página:",
        err
      );

    }


  }


  return images;

}





/*
  Compõe duas matrizes afins 2D no formato

  [a,b,c,d,e,f] (convenção do PDF/Canvas),

  assumindo que m1 é aplicada primeiro e m2

  depois — é exatamente o que o operador "cm"

  do PDF faz: CTM_novo = m1 (operandos) seguido

  do CTM anterior (m2).
*/

function composeMatrix(m1, m2){

  return [

    m1[0] * m2[0] + m1[1] * m2[2],

    m1[0] * m2[1] + m1[1] * m2[3],

    m1[2] * m2[0] + m1[3] * m2[2],

    m1[2] * m2[1] + m1[3] * m2[3],

    m1[4] * m2[0] + m1[5] * m2[2] + m2[4],

    m1[4] * m2[1] + m1[5] * m2[3] + m2[5]

  ];

}





function applyMatrix(point, m){

  const [x, y] = point;

  return [

    x * m[0] + y * m[2] + m[4],

    x * m[1] + y * m[3] + m[5]

  ];

}





function cropImageFromCtm(canvas, ctm){


  /*
    O CTM, nesse ponto da lista de operadores,

    mapeia o quadrado unitário (0,0)-(1,1) —

    espaço padrão de uma imagem em PDF — para

    pixels do canvas já renderizado.
  */

  const corners = [

    applyMatrix([0, 0], ctm),

    applyMatrix([1, 0], ctm),

    applyMatrix([0, 1], ctm),

    applyMatrix([1, 1], ctm)

  ];



  const xs =
    corners.map(p => p[0]);


  const ys =
    corners.map(p => p[1]);



  const minX =
    Math.max(0, Math.floor(Math.min(...xs)));


  const maxX =
    Math.min(canvas.width, Math.ceil(Math.max(...xs)));


  const minY =
    Math.max(0, Math.floor(Math.min(...ys)));


  const maxY =
    Math.min(canvas.height, Math.ceil(Math.max(...ys)));



  const width =
    maxX - minX;


  const height =
    maxY - minY;



  if(width <= 0 || height <= 0){

    return null;

  }



  const cropCanvas =
    document.createElement("canvas");


  cropCanvas.width = width;

  cropCanvas.height = height;



  const ctx =
    cropCanvas.getContext("2d");


  ctx.drawImage(

    canvas,

    minX,
    minY,
    width,
    height,

    0,
    0,
    width,
    height

  );



  return cropCanvas.toDataURL();

}
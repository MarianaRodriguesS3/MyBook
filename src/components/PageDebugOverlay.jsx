import { useEffect, useState } from "react";
import { getParagraphDebugData } from "../services/pdfService";

function PageDebugOverlay({ pdfDoc, pageNumber }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!pdfDoc) return;
    setData(null);
    getParagraphDebugData(pdfDoc, pageNumber).then(setData);
  }, [pdfDoc, pageNumber]);

  if (!data) return <p>Analisando página {pageNumber}...</p>;

  return (
    <div>
      <p>
        <span style={{ color: "red" }}>■</span> quebra de parágrafo &nbsp;
        <span style={{ color: "limegreen" }}>■</span> quebra de linha normal
      </p>
      <div
        style={{ position: "relative", width: data.width, maxWidth: "100%" }}
      >
        <img
          src={data.imageDataUrl}
          alt=""
          style={{ display: "block", width: "100%", height: "auto" }}
        />
        {data.breaks.map((b, i) => (
          <div
            key={i}
            title={b.preview}
            style={{
              position: "absolute",
              left: 0,
              top: `${(b.y / data.height) * 100}%`,
              width: "100%",
              borderTop:
                b.type === "paragraph"
                  ? "3px solid red"
                  : "1px dashed limegreen",
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default PageDebugOverlay;

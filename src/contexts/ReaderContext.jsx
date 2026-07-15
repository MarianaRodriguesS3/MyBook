import { createContext, useContext, useState } from "react";
import { loadPdfDocument, extractPageContent, renderPageThumbnail, } from "../services/pdfService";
import { saveHistoryEntry } from "../services/historyService";

const ReaderContext = createContext();

export function ReaderProvider({ children }) {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [pdfDoc, setPdfDoc] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [mode, setMode] = useState("landscape");
  const [pageCache, setPageCache] = useState({});
  const [loadingPages, setLoadingPages] = useState({});

  async function openFile(selectedFile) {
    setFile(selectedFile);
    setFileName(selectedFile.name);
    setCurrentPage(1);
    setPageCache({});
    const doc = await loadPdfDocument(selectedFile);
    setPdfDoc(doc);
    setTotalPages(doc.numPages);
    saveToHistory(selectedFile, doc);
  }

  async function saveToHistory(selectedFile, doc) {
    try {
      const thumbnail = await renderPageThumbnail(doc, 1);
      await saveHistoryEntry({
        id: selectedFile.name,
        fileName: selectedFile.name,
        blob: selectedFile,
        thumbnail,
        lastOpened: Date.now(),
      });

    } catch (err) {
      console.warn("Não foi possível salvar no histórico:", err);
    }
  }

  async function openFileFromHistory(entry) {
    const restoredFile = new File(
      [entry.blob],
      entry.fileName,
      { type: "application/pdf" }
    );
    await openFile(restoredFile);
  }

  function closeFile() {
    setFile(null);
    setFileName("");
    setPdfDoc(null);
    setCurrentPage(1);
    setTotalPages(0);
    setPageCache({});
  }


  async function loadPage(pageNumber) {
    if (!pdfDoc) return;
    if (pageNumber < 1 || pageNumber > totalPages) return;
    if (pageCache[pageNumber] || loadingPages[pageNumber]) return;

    setLoadingPages((prev) => ({ ...prev, [pageNumber]: true }));

    const content = await extractPageContent(pdfDoc, pageNumber);

    setPageCache((prev) => ({ ...prev, [pageNumber]: content }));

    setLoadingPages((prev) => {
      const next = { ...prev };
      delete next[pageNumber];
      return next;
    });
  }

  function getPageContent(pageNumber) {
    return pageCache[pageNumber] || null;
  }

  return (
    <ReaderContext.Provider
      value={{
        file,
        fileName,
        currentPage,
        setCurrentPage,
        totalPages,
        mode,
        setMode,
        openFile,
        openFileFromHistory,
        closeFile,
        loadPage,
        getPageContent,
      }}
    >
      {children}

    </ReaderContext.Provider>
  );
}

export function useReader() {
  return useContext(ReaderContext);
}
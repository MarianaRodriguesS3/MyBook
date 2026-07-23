import { createContext, useContext, useEffect, useState } from "react";
import { loadPdfDocument, extractPageContent, renderPageThumbnail, } from "../services/pdfService";
import { saveHistoryEntry, updateHistoryPage, } from "../services/historyService";

const ReaderContext = createContext();
const SNIPPET_RADIUS = 32;

export function ReaderProvider({ children }) {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [pdfDoc, setPdfDoc] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [mode, setMode] = useState("landscape");
  const [pageCache, setPageCache] = useState({});
  const [loadingPages, setLoadingPages] = useState({});
  const [highlight, setHighlight] = useState(null);

  useEffect(() => {
    if (!fileName) return;
    updateHistoryPage(fileName, currentPage);
  }, [currentPage, fileName]);

  async function openFile(selectedFile) {
    setFile(selectedFile);
    setFileName(selectedFile.name);
    setPageCache({});
    setHighlight(null);

    const doc = await loadPdfDocument(selectedFile);

    setPdfDoc(doc);
    setTotalPages(doc.numPages);

    await saveToHistory(selectedFile, doc);
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
        currentPage: 1,
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

    setFile(restoredFile);
    setFileName(restoredFile.name);
    setCurrentPage(entry.currentPage || 1);
    setPageCache({});
    setHighlight(null);

    const doc = await loadPdfDocument(restoredFile);

    setPdfDoc(doc);
    setTotalPages(doc.numPages);
  }

  function closeFile() {
    setFile(null);
    setFileName("");
    setPdfDoc(null);
    setCurrentPage(1);
    setTotalPages(0);
    setPageCache({});
    setHighlight(null);
  }

  async function loadPage(pageNumber) {
    if (!pdfDoc) return null;
    if (pageNumber < 1 || pageNumber > totalPages) return null;

    if (pageCache[pageNumber]) {
      return pageCache[pageNumber];
    }

    if (loadingPages[pageNumber]) {
      return null;
    }

    setLoadingPages(prev => ({
      ...prev,
      [pageNumber]: true,
    }));

    try {
      const content = await extractPageContent(pdfDoc, pageNumber);

      setPageCache(prev => ({
        ...prev,
        [pageNumber]: content,
      }));

      return content;

    } catch (err) {
      console.warn(
        `Falha ao carregar a página ${pageNumber}:`,
        err
      );

      const fallback = { text: "", images: [], };

      setPageCache(prev => ({
        ...prev,
        [pageNumber]: fallback,
      }));

      return fallback;

    } finally {
      setLoadingPages(prev => {
        const next = { ...prev };
        delete next[pageNumber];
        return next;
      });
    }
  }

  function getPageContent(pageNumber) {
    return pageCache[pageNumber] || null;
  }

  function goToPage(pageNumber) {
    if (pageNumber < 1 || pageNumber > totalPages) return;
    setCurrentPage(pageNumber);
  }

  async function searchText(query) {
    if (!pdfDoc || !query) return [];

    const lowerQuery = query.toLowerCase();
    const matches = [];

    for (let page = 1; page <= totalPages; page++) {
      const content = pageCache[page] || (await loadPage(page));
      const text = content?.text || "";

      if (!text) continue;

      const lowerText = text.toLowerCase();
      let fromIndex = 0;

      while (true) {
        const foundAt = lowerText.indexOf(lowerQuery, fromIndex);

        if (foundAt === -1) break;

        const start = Math.max(0, foundAt - SNIPPET_RADIUS);
        const end = Math.min(text.length, foundAt + lowerQuery.length + SNIPPET_RADIUS);
        const snippet = (start > 0 ? "…" : "") + text.slice(start, end).trim() + (end < text.length ? "…" : "");

        matches.push({ page, charIndex: foundAt, length: lowerQuery.length, snippet, });

        fromIndex = foundAt + lowerQuery.length;
      }
    }
    return matches;
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
        goToPage,
        searchText,
        highlight,
        setHighlight,
      }}
    >
      {children}
    </ReaderContext.Provider>
  );
}

export function useReader() {
  return useContext(ReaderContext);
}
import { useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { useLanguage } from "../contexts/LanguageContext";
import { useTheme } from "../contexts/ThemeContext";
import { useReader } from "../contexts/ReaderContext";
import ReaderBook from "../components/ReaderBook";
import SpeechControl from "../components/SpeechControl";
import SpeechControlMobile from "../components/SpeechControlMobile";
import FooterReader from "../components/FooterReader";
import "./Reader.css";

function Reader() {
  const { t } = useLanguage();
  const { theme } = useTheme();

  const {
    closeFile,
    currentPage,
    setCurrentPage,
    totalPages,
    mode,
    setMode,
    loadPage,
    getPageContent,
    goToPage,
    searchText,
    highlight,
    setHighlight,
  } = useReader();

  const [playing, setPlaying] = useState(false);
  const [readingPage, setReadingPage] = useState(null);
  const [activeSentence, setActiveSentence] = useState(null);

  const speechControlRef = useRef(null);
  const totalPagesRef = useRef(totalPages);
  const playingRef = useRef(playing);

  const isAndroid = Capacitor.getPlatform() === "android";

  useEffect(() => {
    totalPagesRef.current = totalPages;
  }, [totalPages]);

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  useEffect(() => {
    if (mode === "landscape") {
      loadPage(currentPage);

      if (currentPage + 1 <= totalPages) {
        loadPage(currentPage + 1);
      }
    } else {
      loadPage(currentPage);
    }
  }, [currentPage, mode, totalPages, loadPage]);

  function hasReadableText(content) {
    if (!content || !content.text) return false;

    const cleanText = content.text.replace(/\*/g, "").trim();

    return cleanText.length > 0;
  }

  async function findAndReadNextPage(startPage) {
    if (!playingRef.current) {
      return null;
    }

    const targetPage = await loadPage(startPage);

    if (!hasReadableText(targetPage)) {
      let next = startPage + 1;

      while (next <= totalPagesRef.current) {
        const content = await loadPage(next);

        if (hasReadableText(content)) {
          setCurrentPage(next);
          setReadingPage(next);

          return next;
        }

        next += 1;
      }

      setPlaying(false);

      return null;
    }

    console.log(
      "PROCURANDO PÁGINA COM TEXTO A PARTIR DE:",
      startPage,
      "TOTAL:",
      totalPagesRef.current,
    );

    let waited = 0;

    while (totalPagesRef.current === 0 && waited < 5000) {
      console.log("DOCUMENTO AINDA CARREGANDO, AGUARDANDO...");

      await new Promise((resolve) => setTimeout(resolve, 150));

      waited += 150;
    }

    if (totalPagesRef.current === 0) {
      console.log("DOCUMENTO NÃO CARREGOU A TEMPO");

      setPlaying(false);

      return null;
    }

    let next = startPage;

    while (next <= totalPagesRef.current) {
      console.log("TENTANDO CARREGAR PÁGINA:", next);

      const content = await loadPage(next);

      console.log("CONTEÚDO DA PÁGINA:", next, content);

      if (hasReadableText(content)) {
        console.log("PÁGINA COM TEXTO ENCONTRADA:", next);

        setCurrentPage(next);
        setReadingPage(next);

        return next;
      }

      next++;
    }

    console.log("NENHUMA PÁGINA COM TEXTO ENCONTRADA");

    setPlaying(false);

    return null;
  }

  async function handleFinishPage(pageNumber) {
    setActiveSentence(null);

    if (!playingRef.current) {
      return;
    }

    // Modo página única
    if (mode === "portrait") {
      const nextPage = await findAndReadNextPage(pageNumber + 1);

      if (nextPage != null) {
        setCurrentPage(nextPage);
        setReadingPage(nextPage);
      }

      return;
    }

    // Modo paisagem / duas páginas
    if (pageNumber === currentPage && currentPage + 1 <= totalPages) {
      const rightContent = await loadPage(currentPage + 1);

      if (hasReadableText(rightContent)) {
        setReadingPage(currentPage + 1);

        return;
      }
    }

    const nextPair = currentPage + 2;

    if (nextPair <= totalPages) {
      const content = await loadPage(nextPair);

      if (hasReadableText(content)) {
        setCurrentPage(nextPair);
        setReadingPage(nextPair);

        return;
      }

      await findAndReadNextPage(nextPair + 1);

      return;
    }

    setPlaying(false);
  }

  function handleSentenceClick(pageNumber, sentenceIndex) {
    speechControlRef.current?.seekTo(pageNumber, sentenceIndex);
  }

  function toggleMode() {
    setMode(mode === "landscape" ? "portrait" : "landscape");
  }

  function previousPage() {
    setActiveSentence(null);
    setHighlight(null);

    const step = mode === "landscape" ? 2 : 1;

    if (currentPage > 1) {
      setCurrentPage(Math.max(1, currentPage - step));
    }
  }

  function nextPage() {
    setActiveSentence(null);
    setHighlight(null);

    const step = mode === "landscape" ? 2 : 1;

    if (currentPage < totalPages) {
      setCurrentPage(Math.min(totalPages, currentPage + step));
    }
  }

  function handleSearchResultSelect(result) {
    setActiveSentence(null);

    if (result.kind === "page") {
      setHighlight(null);
    } else {
      setHighlight({
        page: result.page,
        charIndex: result.charIndex,
        length: result.length,
      });
    }

    goToPage(result.page);
  }

  return (
    <div className={`reader theme-${theme}`}>
      <ReaderBook
        mode={mode}
        currentPage={currentPage}
        totalPages={totalPages}
        getPageContent={getPageContent}
        loadingLabel={t("loadingPage")}
        readingPage={readingPage}
        activeSentence={activeSentence}
        playing={playing}
        onSentenceClick={handleSentenceClick}
        searchHighlight={highlight}
        previousPage={previousPage}
        nextPage={nextPage}
      />

      {isAndroid ? (
        <SpeechControlMobile
          ref={speechControlRef}
          currentPage={currentPage}
          getPageContent={getPageContent}
          mode={mode}
          totalPages={totalPages}
          playing={playing}
          setPlaying={setPlaying}
          readingPage={readingPage}
          setReadingPage={setReadingPage}
          setActiveSentence={setActiveSentence}
          onFinishPage={handleFinishPage}
        />
      ) : (
        <SpeechControl
          ref={speechControlRef}
          currentPage={currentPage}
          getPageContent={getPageContent}
          mode={mode}
          totalPages={totalPages}
          playing={playing}
          setPlaying={setPlaying}
          readingPage={readingPage}
          setReadingPage={setReadingPage}
          setActiveSentence={setActiveSentence}
          onFinishPage={handleFinishPage}
        />
      )}

      <FooterReader
        currentPage={currentPage}
        totalPages={totalPages}
        playing={playing}
        mode={mode}
        previousPage={previousPage}
        nextPage={nextPage}
        toggleSpeech={() => {
          document.dispatchEvent(new Event("toggle-reader-speech"));
        }}
        toggleMode={toggleMode}
        closeFile={closeFile}
        goToPage={goToPage}
        searchText={searchText}
        onResultSelect={handleSearchResultSelect}
      />
    </div>
  );
}

export default Reader;

import { useEffect, useRef, useState } from "react";
import { useLanguage } from "../contexts/LanguageContext";
import { useTheme } from "../contexts/ThemeContext";
import { useReader } from "../contexts/ReaderContext";
import ReaderBook from "../components/ReaderBook";
import SpeechControl from "../components/SpeechControl";
import FooterReader from "../components/FooterReader";
import "./Reader.css";

function Reader() {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const { closeFile, currentPage, setCurrentPage, totalPages, mode, setMode, loadPage,
    getPageContent, goToPage, searchText, highlight, setHighlight } = useReader();

  // controle visual da leitura
  const [playing, setPlaying] = useState(false);

  // página que está sendo narrada
  const [readingPage, setReadingPage] = useState(null);

  // frase atual para destaque
  const [activeSentence, setActiveSentence] = useState(null);

  // referência para chamar métodos do SpeechControl diretamente (seekTo)
  const speechControlRef = useRef(null);

  const totalPagesRef = useRef(totalPages);

  useEffect(() => { totalPagesRef.current = totalPages; }, [totalPages]);

  // Carrega páginas visíveis
  useEffect(() => {

    if (mode === "landscape") {
      loadPage(currentPage);

      if (currentPage + 1 <= totalPages) {
        loadPage(currentPage + 1);
      }

    } else {
      loadPage(currentPage);
    }
  }, [
    currentPage,
    mode,
    totalPages,
    loadPage
  ]);

  async function findAndReadNextPage(startPage) {

    console.log("PROCURANDO PÁGINA COM TEXTO A PARTIR DE:", startPage, "TOTAL:", totalPagesRef.current);

    let waited = 0;

    while (
      totalPagesRef.current === 0 && waited < 5000
    ) {

      console.log("DOCUMENTO AINDA CARREGANDO, AGUARDANDO...");

      await new Promise(
        resolve => setTimeout(resolve, 150)
      );

      waited += 150;
    }

    if (totalPagesRef.current === 0) {
      console.log("DOCUMENTO NÃO CARREGOU A TEMPO");

      setPlaying(false);

      return null;
    }

    let next = startPage;

    while (
      next <= totalPagesRef.current
    ) {

      console.log("TENTANDO CARREGAR PÁGINA:", next);

      const content = await loadPage(next);

      console.log("CONTEÚDO DA PÁGINA:", next, content);

      if (content && content.text && content.text.trim().length > 0) {

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

    if (mode === "portrait") {
      await findAndReadNextPage(
        pageNumber + 1
      );

      return;
    }

    if (pageNumber === currentPage && currentPage + 1 <= totalPages) {

      const rightContent = await loadPage(currentPage + 1);

      if (rightContent && rightContent.text && rightContent.text.trim()) {

        setReadingPage(currentPage + 1);

        return;
      }
    }

    const nextPair = currentPage + 2;

    if (nextPair <= totalPages) {

      const content = await loadPage(nextPair);

      if (content && content.text && content.text.trim()) {

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

    if (playing) {

      return;
    }

    speechControlRef.current?.seekTo(
      pageNumber,
      sentenceIndex
    );
  }

  function toggleMode() {
    setMode(
      mode === "landscape" ? "portrait" : "landscape"
    );
  }

  function previousPage() {
    setActiveSentence(null);

    const step = mode === "landscape" ? 2 : 1;

    if (currentPage > 1) {
      setCurrentPage(Math.max(1, currentPage - step)
      );
    }
  }

  function nextPage() {
    setActiveSentence(null);

    const step = mode === "landscape" ? 2 : 1;

    if (currentPage < totalPages) {

      setCurrentPage(
        Math.min(totalPages, currentPage + step)
      );
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
        length: result.length
      });
    }

    goToPage(
      result.page
    );
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
      />

      <SpeechControl
        ref={speechControlRef}
        currentPage={currentPage}
        getPageContent={getPageContent}
        loadPage={loadPage}
        mode={mode}
        totalPages={totalPages}
        playing={playing}
        setPlaying={setPlaying}
        readingPage={readingPage}
        setReadingPage={setReadingPage}
        setActiveSentence={setActiveSentence}
        onFinishPage={handleFinishPage}
      />





      <FooterReader

        currentPage={currentPage}

        totalPages={totalPages}

        playing={playing}

        mode={mode}

        previousPage={previousPage}

        nextPage={nextPage}

        toggleSpeech={() => {
          document
            .dispatchEvent(
              new Event(
                "toggle-reader-speech"
              )
            );
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
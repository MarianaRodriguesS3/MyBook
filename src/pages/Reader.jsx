import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { useLanguage } from "../contexts/LanguageContext";
import { useTheme } from "../contexts/ThemeContext";
import { useReader } from "../contexts/ReaderContext";
import FooterReader from "../components/FooterReader";
import "./Reader.css";

const MAX_FONT_SIZE = 22;
const MIN_FONT_SIZE = 9;

// Renderiza o conteúdo de uma página
function PageContent({ pageNumber, content, loadingLabel, mode }) {
  const containerRef = useRef(null);

  useLayoutEffect(() => {
    const el = containerRef.current;

    if (!el || !content) return;

    function fit() {
      let size = mode === "portrait" ? 28 : 22;

      el.style.fontSize = `${size}px`;

      while (
        el.scrollHeight > el.clientHeight &&
        size > MIN_FONT_SIZE
      ) {
        size--;
        el.style.fontSize = `${size}px`;
      }
    }

    fit();

    const resizeObserver = new ResizeObserver(() => {
      fit();
    });

    if (el.parentElement) {
      resizeObserver.observe(el.parentElement);
    }

    return () => resizeObserver.disconnect();
  }, [content, pageNumber]);

  if (!content) {
    return (
      <p className="page-loading">
        {loadingLabel}
      </p>
    );
  }

  const hasText =
    content.text &&
    content.text.trim().length > 0;

  return (
    <div
      className={`page-fit ${hasText ? "" : "image-only"
        }`}
    >
      {content.images.map((src, index) => (
        <img
          key={index}
          src={src}
          alt=""
          className={`page-image ${hasText
            ? ""
            : "page-image-full"
            }`}
        />
      ))}

      {hasText && (
        <p ref={containerRef} className="page-text">
          {content.text}
        </p>
      )}
    </div>
  );
}

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
  } = useReader();

  const [playing, setPlaying] = useState(false);

  // Carrega as páginas visíveis
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
    loadPage,
  ]);

  function toggleMode() {
    setMode(
      mode === "landscape"
        ? "portrait"
        : "landscape"
    );
  }

  function previousPage() {
    if (mode === "landscape") {
      if (currentPage > 2) {
        setCurrentPage(currentPage - 2);
      } else {
        setCurrentPage(1);
      }
    } else {
      if (currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
    }
  }

  function nextPage() {
    if (mode === "landscape") {
      if (currentPage + 2 <= totalPages) {
        setCurrentPage(currentPage + 2);
      }
    } else {
      if (currentPage < totalPages) {
        setCurrentPage(currentPage + 1);
      }
    }
  }

  function toggleSpeech() {
    setPlaying(!playing);
  }

  return (
    <div className={`reader theme-${theme}`}>

      <section
        className={`book-area ${mode}`}
      >

        {mode === "landscape" ? (
          <>

            <div className="page left-page">
              <PageContent
                pageNumber={currentPage}
                content={getPageContent(currentPage)}
                loadingLabel={t("loadingPage")}
                mode={mode}
              />
            </div>

            <div className="page-divider"></div>

            <div className="page right-page">
              {currentPage + 1 <=
                totalPages && (
                  <PageContent
                    pageNumber={
                      currentPage + 1
                    }
                    content={getPageContent(
                      currentPage + 1
                    )}
                    loadingLabel={t(
                      "loadingPage"
                    )}
                  />
                )}
            </div>

          </>
        ) : (
          <div className="page single-page">
            <PageContent
              pageNumber={currentPage}
              content={getPageContent(
                currentPage
              )}
              loadingLabel={t(
                "loadingPage"
              )}
            />
          </div>
        )}

      </section>

      <FooterReader
        currentPage={currentPage}
        totalPages={totalPages}
        playing={playing}
        mode={mode}
        previousPage={previousPage}
        nextPage={nextPage}
        toggleSpeech={toggleSpeech}
        toggleMode={toggleMode}
        closeFile={closeFile}
      />

    </div>
  );
}

export default Reader;
import { useEffect, useRef, useState } from "react";
import { useLanguage } from "../contexts/LanguageContext";
import { useSpeech } from "../contexts/SpeechContext";
import "./FooterReader.css";

function SearchIcon() {
  return (
    <svg className="icon-svg" width="1em" height="1em" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none">
      <circle cx="10" cy="10" r="6.5" stroke="currentColor" strokeWidth="2.4" />
      <line x1="15" y1="15" x2="20.5" y2="20.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

function PlayDisabledIcon() {
  return (
    <svg className="play-disabled-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="11" fill="#ffffff" stroke="#d0d0d0" strokeWidth="1" />
      <path d="M9.3 7.2 L9.3 16.8 L16.8 12 Z" fill="#1a1a1a" />
      <circle cx="12" cy="12" r="10" fill="none" stroke="#e53935" strokeWidth="2.2" />
      <line x1="5.3" y1="5.3" x2="18.7" y2="18.7" stroke="#e53935" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function FooterReader({
  currentPage,
  totalPages,
  playing,
  mode,
  previousPage,
  nextPage,
  toggleSpeech,
  toggleMode,
  closeFile,
  goToPage,
  searchText,
  onResultSelect,
}) {
  const { t } = useLanguage();
  const { speech } = useSpeech();

  // mensagem temporária "habilite o modo fala..."
  const [showSpeechNotice, setShowSpeechNotice] = useState(false);

  const noticeTimeoutRef = useRef(null);

  // estado da busca
  const [searchQuery, setSearchQuery] = useState("");
  const [searchError, setSearchError] = useState(false);
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const errorTimeoutRef = useRef(null);
  const searchBoxRef = useRef(null);

  useEffect(() => {
    return () => {
      if (noticeTimeoutRef.current) {
        clearTimeout(noticeTimeoutRef.current);
      }
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
    };
  }, []);

  // fecha a lista de resultados ao clicar fora da caixa de pesquisa
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        searchBoxRef.current &&
        !searchBoxRef.current.contains(event.target)
      ) {
        setResults([]);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handlePlayClick() {
    if (!speech) {
      setShowSpeechNotice(true);

      if (noticeTimeoutRef.current) {
        clearTimeout(noticeTimeoutRef.current);
      }
      noticeTimeoutRef.current = setTimeout(() => {
        setShowSpeechNotice(false);
      }, 2500);

      return;
    }
    toggleSpeech();
  }

  function flashSearchError() {
    setSearchError(true);

    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
    }

    errorTimeoutRef.current = setTimeout(() => {
      setSearchError(false);
    }, 1500);
  }

  function selectResult(result) {
    setResults([]);
    onResultSelect?.(result);
  }

  async function runSearch() {
    const query = searchQuery.trim();

    if (!query || searching) return;

    setResults([]);

    const asNumber = Number(query);
    const isPageNumber = Number.isInteger(asNumber) && String(asNumber) === query;
    const pageIsValid = isPageNumber && asNumber >= 1 && asNumber <= totalPages;

    setSearching(true);

    try {
      const textMatches = (await searchText?.(query)) || [];

      const combined = [
        ...(pageIsValid ? [{ kind: "page", page: asNumber }] : []),
        ...textMatches.map((match) => ({ kind: "text", ...match })),
      ];

      if (combined.length === 0) {
        flashSearchError();
      } else if (combined.length === 1) {
        selectResult(combined[0]);
      } else {
        setResults(combined);
      }
    } finally {
      setSearching(false);
    }
  }

  function handleSearchChange(event) {
    setSearchQuery(event.target.value);
    if (results.length > 0) setResults([]);
  }

  function handleSearchKeyDown(event) {
    if (event.key === "Enter") {
      runSearch();
    } else if (event.key === "Escape") {
      setResults([]);
    }
  }

  return (
    <footer className="reader-footer">
      <div className="footer-left">
        {/* Voltar para Home */}
        <button
          className="footer-button"
          onClick={closeFile}
          title={t("back")}
        >
          ←
        </button>
      </div>

      <div className="footer-center">
        {/* Página anterior */}
        <button
          className="footer-button"
          onClick={previousPage}
          disabled={currentPage <= 1}
          title={t("previousPage")}
        >
          ‹
        </button>

        {/* Play / Pause */}
        <div className="play-button-wrapper">
          <button
            className={`play-button ${!speech ? "play-button-disabled" : ""}`}
            onClick={handlePlayClick}
            title={
              !speech
                ? t("speechDisabledTitle")
                : (playing ? t("pause") : t("play"))
            }
          >
            {!speech ? <PlayDisabledIcon /> : (playing ? "⏸" : "▶")}
          </button>

          {showSpeechNotice && (
            <div className="speech-disabled-toast">
              {t("enableSpeechInSettings")}
            </div>
          )}
        </div>

        {/* Pesquisa */}
        <div className="search-box-wrapper" ref={searchBoxRef}>
          <div className={`search-box ${searchError ? "search-box-error" : ""}`}>
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              onKeyDown={handleSearchKeyDown}
              placeholder={t("searchPlaceholder")}
              disabled={searching}
            />

            <button
              className="search-button"
              onClick={runSearch}
              title={t("search")}
              disabled={searching}
            >
              {searching ? "…" : <SearchIcon />}
            </button>
          </div>

          {results.length > 0 && (
            <ul className="search-results-list">
              {results.map((result, i) => (
                <li
                  key={`${result.kind}-${result.page}-${result.charIndex ?? "page"}-${i}`}
                  className="search-result-item"
                  onClick={() => selectResult(result)}
                >
                  <span className="search-result-page">
                    {t("page")} {result.page}
                  </span>
                  {result.kind === "text" && (
                    <span className="search-result-snippet">
                      {result.snippet}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Contador */}
        <span className="page-counter">
          {currentPage} / {totalPages || "--"}
        </span>

        {/* Próxima página */}
        <button
          className="footer-button"
          onClick={nextPage}
          disabled={
            mode === "landscape"
              ? currentPage + 2 > totalPages
              : currentPage >= totalPages
          }
          title={t("nextPage")}
        >
          ›
        </button>
      </div>

      <div className="footer-right">
        {/* Alternar modo */}
        <button
          className="footer-button"
          onClick={toggleMode}
          title={
            mode === "landscape"
              ? t("singlePageMode")
              : t("bookMode")
          }
        >
          {mode === "landscape" ? "📖" : "📚"}
        </button>
      </div>
    </footer>
  );
}

export default FooterReader;
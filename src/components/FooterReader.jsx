import { useLanguage } from "../contexts/LanguageContext";
import "./FooterReader.css";

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
}) {
  const { t } = useLanguage();

  return (
    <footer className="reader-footer">

      {/* Voltar para Home */}
      <button
        className="footer-button"
        onClick={closeFile}
        title={t("back")}
      >
        ←
      </button>

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
      <button
        className="play-button"
        onClick={toggleSpeech}
        title={playing ? t("pause") : t("play")}
      >
        {playing ? "⏸" : "▶"}
      </button>

      {/* Pesquisa */}
      <div className="search-box">
        <input
          type="text"
          placeholder={t("searchPlaceholder")}
        />

        <button
          className="search-button"
          title={t("search")}
        >
          🔍
        </button>
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

    </footer>
  );
}

export default FooterReader;
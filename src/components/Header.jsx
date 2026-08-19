import "./Header.css";
import { Capacitor } from "@capacitor/core";
import { useLanguage } from "../contexts/LanguageContext";
import SearchButton from "./SearchButton";

const APK_URL =
  "https://github.com/MarianaRodriguesS3/MyBook/releases/download/v1.0.0/MyBook.apk";

function Header({ toggleMenu, menuOpen }) {
  const { t } = useLanguage();

  const isAndroidApp = Capacitor.getPlatform() === "android";

  return (
    <header className="header">
      {!menuOpen && (
        <button
          className="menu-button"
          onClick={toggleMenu}
          title={t("openMenu")}
          aria-label={t("openMenu")}
        >
          <svg
            className="icon-svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M4 5H20"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M4 12H16"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M4 19H20"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      )}

      <div className="header-center">
        <h1>{t("headerTitle")}</h1>
        <SearchButton />
      </div>

      {!isAndroidApp && (
        <a
          className="download-button"
          href={APK_URL}
          download="MyBook.apk"
          title="Baixar aplicativo Android"
          aria-label="Baixar aplicativo Android"
        >
          <svg
            className="download-icon"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M12 3V15"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M7 10L12 15L17 10"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M5 21H19"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </a>
      )}
    </header>
  );
}

export default Header;

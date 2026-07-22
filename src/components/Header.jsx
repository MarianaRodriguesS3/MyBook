import "./Header.css";
import { useLanguage } from "../contexts/LanguageContext";
import SearchButton from "./SearchButton";

function Header({
  toggleMenu,
  menuOpen
}) {
  const { t } = useLanguage();

  return (
    <header className="header">
      {!menuOpen && (
        <button className="menu-button" onClick={toggleMenu} title={t("openMenu")}>
          <svg className="icon-svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M4 5H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <path d="M4 12H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <path d="M4 19H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
      )}

      <div className="header-center">
        <h1>{t("headerTitle")}</h1>
        <SearchButton />
      </div>
    </header>
  );
}

export default Header;
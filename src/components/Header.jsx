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
      {
        !menuOpen && (
          <button
            className="menu-button"
            onClick={toggleMenu}
            title={t("openMenu")}
          >
            ☰
          </button>
        )
      }

      <div className="header-center">
        <h1>
          {t("headerTitle")}
        </h1>
        <SearchButton />
      </div>

    </header>
  );
}

export default Header;
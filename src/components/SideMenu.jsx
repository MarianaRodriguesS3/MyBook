import "./SideMenu.css";
import { useLanguage } from "../contexts/LanguageContext";
import { useTheme } from "../contexts/ThemeContext";
import { useSpeech } from "../contexts/SpeechContext";

function MenuIcon() {
  return (
    <svg className="icon-svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M4 5H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 12H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 19H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function SideMenu({
  open, toggleMenu
}) {

  const { t, language, setLanguage } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { speech, toggleSpeech } = useSpeech();

  return (
    <aside className={`side-menu ${open ? "open" : ""}`}>
      <div className="side-menu-title">
        <button className="close-menu-button" onClick={toggleMenu}>
          <MenuIcon />
        </button>
        <h2>
          {t("settings")}
        </h2>
      </div>

      {/* Tema */}
      <div className="menu-section">
        <label>{t("theme")}</label>
        <select value={theme} onChange={(e) => setTheme(e.target.value)}>
          <option value="dia">{t("day")}</option>
          <option value="noite">{t("night")}</option>
          <option value="azul">{t("blue")}</option>
          <option value="verde">{t("green")}</option>
          <option value="matrix">{t("matrix")}</option>
        </select>
      </div>

      {/* Idioma */}
      <div className="menu-section">
        <label>{t("language")}</label>
        <select value={language} onChange={(e) => setLanguage(e.target.value)}>
          <option value="pt-BR">Português</option>
          <option value="en-US">English</option>
          <option value="es-ES">Español</option>
        </select>
      </div>

      {/* Fala */}
      <div className="menu-section">
        <label>{t("speech")}</label>
        <button className={`speech-button ${speech ? "active" : "inactive"}`}
          onClick={toggleSpeech}>
          {speech ? `🔊 ${t("enabled")}` : `🔇 ${t("disabled")}`}
        </button>
      </div>
    </aside>
  );
}

export default SideMenu;
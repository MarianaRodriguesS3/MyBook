import { useRef, useState } from "react";
import "./SideMenu.css";
import { useLanguage } from "../contexts/LanguageContext";
import { useTheme } from "../contexts/ThemeContext";
import { useSpeech } from "../contexts/SpeechContext";

function MenuIcon() {
  return (
    <svg
      className="icon-svg"
      width="28"
      height="28"
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
  );
}

function CustomSelect({ label, value, options, open, onToggle, onSelect }) {
  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div className="menu-section">
      <label>{label}</label>
      <button
        type="button"
        className={`custom-select-trigger ${open ? "open" : ""}`}
        onClick={onToggle}
      >
        <span>{selectedOption?.label || value}</span>
        <span className={`arrow ${open ? "up" : "down"}`}>▼</span>
      </button>

      {open && (
        <div className="custom-options-container">
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                className={`custom-option ${isSelected ? "selected" : ""}`}
                onClick={() => onSelect(option.value)}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SideMenu({ open, toggleMenu }) {
  const { t, language, setLanguage } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { speech, toggleSpeech } = useSpeech();

  const [openSelect, setOpenSelect] = useState(null);

  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const handleTouchStart = (e) => {
    touchStartX.current = e.targetTouches[0].clientX;
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    const distance = touchStartX.current - touchEndX.current;
    if (distance > 50 && open) {
      toggleMenu();
    }
  };

  const themeOptions = [
    { label: t("day"), value: "dia" },
    { label: t("night"), value: "noite" },
    { label: t("blue"), value: "azul" },
    { label: t("green"), value: "verde" },
    { label: t("matrix"), value: "matrix" },
  ];

  const languageOptions = [
    { label: "Português", value: "pt-BR" },
    { label: "English", value: "en-US" },
    { label: "Español", value: "es-ES" },
  ];

  return (
    <aside
      className={`side-menu ${open ? "open" : ""}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="side-menu-header">
        <button className="close-menu-button" onClick={toggleMenu}>
          <MenuIcon />
        </button>
        <h2>{t("settings")}</h2>
      </div>

      <div className="side-menu-content">
        <CustomSelect
          label={t("theme")}
          value={theme}
          options={themeOptions}
          open={openSelect === "theme"}
          onToggle={() =>
            setOpenSelect(openSelect === "theme" ? null : "theme")
          }
          onSelect={(val) => {
            setTheme(val);
            setOpenSelect(null);
          }}
        />

        <CustomSelect
          label={t("language")}
          value={language}
          options={languageOptions}
          open={openSelect === "language"}
          onToggle={() =>
            setOpenSelect(openSelect === "language" ? null : "language")
          }
          onSelect={(val) => {
            setLanguage(val);
            setOpenSelect(null);
          }}
        />

        <div className="menu-section">
          <label>{t("speech")}</label>
          <button
            className={`speech-button ${speech ? "active" : "inactive"}`}
            onClick={toggleSpeech}
          >
            {speech ? `🔊 ${t("enabled")}` : `🔇 ${t("disabled")}`}
          </button>
        </div>
      </div>
    </aside>
  );
}

export default SideMenu;

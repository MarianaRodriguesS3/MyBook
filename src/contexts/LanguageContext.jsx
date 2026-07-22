import { createContext, useContext, useEffect, useState } from "react";
import translations from "../translations/translations";

const LanguageContext = createContext();

const STORAGE_KEY = "reader-language";

function getStoredLanguage() {
  try {
    return localStorage.getItem(STORAGE_KEY) || "pt-BR";
  } catch (err) {
    // localStorage indisponível (modo privado, etc) — usa o padrão
    return "pt-BR";
  }
}

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(getStoredLanguage);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, language);
    } catch (err) {
      // silencioso — se não der pra salvar, só não persiste
    }
  }, [language]);

  function t(key) {
    return translations[language]?.[key] || key;
  }

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
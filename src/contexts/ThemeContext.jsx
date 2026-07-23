import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext();
const STORAGE_KEY = "reader-theme";

function getStoredTheme() {
  try {
    return localStorage.getItem(STORAGE_KEY) || "dia";
  } catch (err) {
    // localStorage indisponível (modo privado, etc) — usa o padrão
    return "dia";
  }
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getStoredTheme);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (err) {
      // silencioso — se não der pra salvar, só não persiste
    }
  }, [theme]);

  return (
    <ThemeContext.Provider
      value={{ theme, setTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
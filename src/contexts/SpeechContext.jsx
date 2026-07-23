import { createContext, useContext, useEffect, useState } from "react";

const SpeechContext = createContext();
const STORAGE_KEY = "reader-speech";

function getStoredSpeech() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);

    // Se não existir nada salvo, mantém o padrão como true
    return stored !== null ? JSON.parse(stored) : true;
  } catch (err) {
    // localStorage indisponível (modo privado, etc) — usa o padrão
    return true;
  }
}

export function SpeechProvider({ children }) {
  const [speech, setSpeech] = useState(getStoredSpeech);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(speech));
    } catch (err) {
      // silencioso — se não der pra salvar, só não persiste
    }
  }, [speech]);

  function toggleSpeech() {
    setSpeech((prev) => !prev);
  }

  return (
    <SpeechContext.Provider
      value={{ speech, toggleSpeech }}
    >
      {children}
    </SpeechContext.Provider>
  );
}

export function useSpeech() {
  return useContext(SpeechContext);
}
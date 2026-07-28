import { createContext, useContext, useEffect, useState } from "react";

const SpeechContext = createContext();
const STORAGE_KEY = "reader-speech";

function getStoredSpeech() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored !== null ? JSON.parse(stored) : true;
  } catch (err) {
    return true;
  }
}

export function SpeechProvider({ children }) {
  const [speech, setSpeech] = useState(getStoredSpeech);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(speech));
    } catch (err) {
      // Silencioso
    }

    // Se o usuário desativar a fala pelo menu enquanto algo está sendo falado,
    // cancelamos a reprodução do sintetizador imediatamente.
    if (!speech && typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, [speech]);

  function toggleSpeech() {
    setSpeech((prev) => !prev);
  }

  // Função centralizada para disparar a fala com validação
  function speak(utteranceOrText) {
    if (!speech) return; // 🛑 TRAVA GLOBAL: se speech for false, ignora totalmente

    if (typeof window !== "undefined" && window.speechSynthesis) {
      // Se for uma string simples, converte para SpeechSynthesisUtterance
      const utterance =
        typeof utteranceOrText === "string"
          ? new SpeechSynthesisUtterance(utteranceOrText)
          : utteranceOrText;

      window.speechSynthesis.cancel(); // Para fala anterior antes de iniciar a nova
      window.speechSynthesis.speak(utterance);
    }
  }

  // Função centralizada para cancelar/parar a fala
  function stop() {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }

  return (
    <SpeechContext.Provider value={{ speech, toggleSpeech, speak, stop }}>
      {children}
    </SpeechContext.Provider>
  );
}

export function useSpeech() {
  return useContext(SpeechContext);
}

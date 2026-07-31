import { createContext, useContext, useEffect, useState } from "react";

const SpeechContext = createContext();
const SPEECH_STORAGE_KEY = "reader-speech";
const VOICE_STORAGE_KEY = "reader-selected-voice";

function getStoredSpeech() {
  try {
    const stored = localStorage.getItem(SPEECH_STORAGE_KEY);
    return stored !== null ? JSON.parse(stored) : true;
  } catch (err) {
    return true;
  }
}

function getStoredVoiceName() {
  try {
    return localStorage.getItem(VOICE_STORAGE_KEY) || "";
  } catch (err) {
    return "";
  }
}

export function SpeechProvider({ children }) {
  const [speech, setSpeech] = useState(getStoredSpeech);
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);

  useEffect(() => {
    function loadVoices() {
      if (typeof window === "undefined" || !("speechSynthesis" in window))
        return;

      const availableVoices = window.speechSynthesis.getVoices();
      const ptVoices = availableVoices.filter((v) => v.lang.startsWith("pt"));

      setVoices(ptVoices);

      if (ptVoices.length > 0) {
        const savedVoiceName = getStoredVoiceName();
        const savedVoice = ptVoices.find((v) => v.name === savedVoiceName);

        if (savedVoice) {
          setSelectedVoice(savedVoice);
        } else if (!selectedVoice) {
          const defaultVoice =
            ptVoices.find(
              (v) => v.name.includes("Google") || v.name.includes("Natural"),
            ) || ptVoices[0];

          setSelectedVoice(defaultVoice);
        }
      }
    }

    loadVoices();

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(SPEECH_STORAGE_KEY, JSON.stringify(speech));
    } catch (err) {}

    if (!speech && typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, [speech]);

  const handleSetSelectedVoice = (voice) => {
    setSelectedVoice(voice);
    if (voice?.name) {
      try {
        localStorage.setItem(VOICE_STORAGE_KEY, voice.name);
      } catch (err) {}
    }
  };

  function toggleSpeech() {
    setSpeech((prev) => !prev);
  }

  function speak(utteranceOrText) {
    if (!speech) return;

    if (typeof window !== "undefined" && window.speechSynthesis) {
      const utterance =
        typeof utteranceOrText === "string"
          ? new SpeechSynthesisUtterance(utteranceOrText)
          : utteranceOrText;

      if (selectedVoice) {
        utterance.voice = selectedVoice;
        utterance.lang = selectedVoice.lang;
      }

      window.speechSynthesis.speak(utterance);
    }
  }

  function stop() {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }

  return (
    <SpeechContext.Provider
      value={{
        speech,
        toggleSpeech,
        speak,
        stop,
        voices,
        selectedVoice,
        setSelectedVoice: handleSetSelectedVoice,
      }}
    >
      {children}
    </SpeechContext.Provider>
  );
}

export function useSpeech() {
  return useContext(SpeechContext);
}

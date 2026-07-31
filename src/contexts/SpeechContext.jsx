import { createContext, useContext, useState } from "react";

const SpeechContext = createContext(null);

export function SpeechProvider({ children }) {
  const [speech, setSpeech] = useState(true);
  const [selectedVoice, setSelectedVoice] = useState(null);

  function toggleSpeech() {
    setSpeech((current) => !current);
  }

  return (
    <SpeechContext.Provider
      value={{
        speech,
        toggleSpeech,
        selectedVoice,
        setSelectedVoice,
      }}
    >
      {children}
    </SpeechContext.Provider>
  );
}

export function useSpeech() {
  return useContext(SpeechContext);
}

export default SpeechContext;

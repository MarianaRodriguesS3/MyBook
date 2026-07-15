import { createContext, useContext, useState } from "react";

const SpeechContext = createContext();

export function SpeechProvider({ children }) {
  const [speech, setSpeech] = useState(true);

  function toggleSpeech(){
    setSpeech(!speech);
  }

  return (
    <SpeechContext.Provider
      value={{
        speech,
        toggleSpeech
      }}
    >
      {children}
    </SpeechContext.Provider>
  );
}

export function useSpeech(){
  return useContext(SpeechContext);
}
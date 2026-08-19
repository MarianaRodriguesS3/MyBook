import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { Capacitor } from "@capacitor/core";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { SpeechProvider } from "./contexts/SpeechContext";
import { ReaderProvider } from "./contexts/ReaderContext";
import "./index.css";

if (Capacitor.isNativePlatform()) {
  document.body.classList.add("capacitor");
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider>
      <LanguageProvider>
        <SpeechProvider>
          <ReaderProvider>
            <App />
          </ReaderProvider>
        </SpeechProvider>
      </LanguageProvider>
    </ThemeProvider>
  </React.StrictMode>,
);

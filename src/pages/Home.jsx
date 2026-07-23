import { useState } from "react";
import Header from "../components/Header";
import SideMenu from "../components/SideMenu";
import History from "../components/History";
import { useTheme } from "../contexts/ThemeContext";
import { useSpeech } from "../contexts/SpeechContext";
import "../App.css";

function Home() {

  const [menuOpen, setMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const { speech, toggleSpeech } = useSpeech();

  function toggleMenu() {
    setMenuOpen(!menuOpen);
  }

  return (
    <div className={`app theme-${theme}`}>
      <SideMenu
        open={menuOpen}
        toggleMenu={toggleMenu}
        theme={theme}
        setTheme={setTheme}
        speech={speech}
        toggleSpeech={toggleSpeech}
      />

      <div className={`content ${menuOpen ? "menu-open" : ""}`}>
        <Header
          toggleMenu={toggleMenu}
          menuOpen={menuOpen}
        />
        <History />
      </div>
    </div>
  );
}

export default Home;
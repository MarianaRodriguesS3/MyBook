import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { useSpeech } from "../contexts/SpeechContext";
import { splitText } from "./PageText"; // 🟢 Importando a função direto do PageText

const SpeechControl = forwardRef(function SpeechControl(
  {
    currentPage,
    getPageContent,
    loadPage,
    mode,
    totalPages,
    playing,
    setPlaying,
    readingPage,
    setReadingPage,
    setActiveSentence,
    onFinishPage,
  },
  ref,
) {
  const { speech, selectedVoice } = useSpeech();
  const currentUtterance = useRef(null);
  const sentenceIndex = useRef(0);
  const sentences = useRef([]);
  const pageReading = useRef(null);
  const playingRef = useRef(playing);
  const pausedRef = useRef(false);
  const isPausingRef = useRef(false);

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  function speakSentence() {
    if (sentenceIndex.current >= sentences.current.length) {
      onFinishPage(pageReading.current);
      return;
    }

    const index = sentenceIndex.current;
    setActiveSentence(index);

    const text = sentences.current[index];
    const utterance = new SpeechSynthesisUtterance(text);

    if (selectedVoice) {
      utterance.voice = selectedVoice;
      utterance.lang = selectedVoice.lang;
    } else {
      utterance.lang = "pt-BR";
    }

    utterance.rate = 1;
    utterance.pitch = 1;

    utterance.onend = () => {
      // Se foi um pause manual, bloqueia o avanço de frase
      if (isPausingRef.current) {
        isPausingRef.current = false;
        return;
      }

      sentenceIndex.current++;

      // 🟢 Pequeno respiro de 50ms para impedir o travamento da Web Speech API entre frases
      setTimeout(() => {
        if (playingRef.current) {
          speakSentence();
        }
      }, 50);
    };

    utterance.onerror = (event) => {
      if (event.error === "canceled" || event.error === "interrupted") {
        return;
      }

      playingRef.current = false;
      setPlaying(false);
      setActiveSentence(null);
    };

    currentUtterance.current = utterance;
    window.speechSynthesis.speak(utterance);
  }

  async function startReading(pageNumber, startIndex = 0) {
    if (!speech) {
      return;
    }

    const page = getPageContent(pageNumber);

    if (!page || !page.text || !page.text.trim()) {
      if (
        mode === "landscape" &&
        pageNumber === currentPage &&
        currentPage + 1 <= totalPages
      ) {
        const rightPage = getPageContent(currentPage + 1);

        if (rightPage && rightPage.text && rightPage.text.trim()) {
          startReading(currentPage + 1);
          return;
        }
      }

      playingRef.current = false;
      setPlaying(false);
      return;
    }

    window.speechSynthesis.cancel();

    sentences.current = splitText(page.text);
    sentenceIndex.current = Math.min(
      Math.max(startIndex, 0),
      sentences.current.length - 1,
    );
    pageReading.current = pageNumber;

    setReadingPage(pageNumber);
    playingRef.current = true;
    setPlaying(true);
    speakSentence();
  }

  useImperativeHandle(ref, () => ({
    seekTo(pageNumber, sentenceIndex) {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }

      startReading(pageNumber, sentenceIndex);
    },
  }));

  function toggle() {
    if (!speech) return;

    // 1. SE ESTÁ TOCANDO: PAUSA
    if (playingRef.current) {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.pause();
      }

      playingRef.current = false;
      pausedRef.current = true;
      setPlaying(false);
      return;
    }

    // 2. SE ESTAVA PAUSADO: RETOMA (PLAY)
    if (pausedRef.current) {
      pausedRef.current = false;
      playingRef.current = true;
      setPlaying(true);

      // Tenta retomar nativamente
      window.speechSynthesis.resume();

      // Pequena verificação após 50ms para ver se o áudio realmente voltou a falar
      setTimeout(() => {
        // Se após tentar dar resume o motor do mobile NÃO estiver falando, força a recriação da frase
        if (!window.speechSynthesis.speaking && playingRef.current) {
          window.speechSynthesis.cancel();
          speakSentence();
        }
      }, 50);

      return;
    }

    // 3. PRIMEIRA EXECUÇÃO (PLAY DO ZERO)
    window.speechSynthesis.cancel();
    pausedRef.current = false;
    startReading(currentPage);
  }

  const toggleRef = useRef(toggle);

  useEffect(() => {
    toggleRef.current = toggle;
  });

  useEffect(() => {
    function handler() {
      toggleRef.current();
    }

    document.addEventListener("toggle-reader-speech", handler);

    return () => {
      document.removeEventListener("toggle-reader-speech", handler);
    };
  }, []);

  useEffect(() => {
    if (readingPage != null && readingPage !== pageReading.current) {
      if (playingRef.current) {
        setTimeout(() => {
          startReading(readingPage);
        }, 100);
      } else {
        pageReading.current = readingPage;
      }
    }
  }, [readingPage]);

  // 🔒 Evita que a tela do celular apague durante a leitura
  useEffect(() => {
    let wakeLock = null;

    if (playing && "wakeLock" in navigator) {
      navigator.wakeLock
        .request("screen")
        .then((lock) => {
          wakeLock = lock;
        })
        .catch((err) => {
          console.warn("Wake Lock não ativado:", err);
        });
    }

    return () => {
      if (wakeLock) {
        wakeLock.release().catch(() => {});
      }
    };
  }, [playing]);

  // 🛑 Cleanup na desmontagem do componente
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
      pausedRef.current = false;
    };
  }, []);

  return null;
});

export default SpeechControl;

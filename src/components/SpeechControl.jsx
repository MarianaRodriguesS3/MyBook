import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { useSpeech } from "../contexts/SpeechContext";

function splitText(text) {
  if (!text) return [];

  return text
    .split(/(?<=[.!?])\s+/)
    .filter(
      item =>
        item.trim().length > 0
    );

}

const SpeechControl = forwardRef(function SpeechControl({
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
  onFinishPage
}, ref) {

  const { speech } = useSpeech();
  const currentUtterance = useRef(null);
  const sentenceIndex = useRef(0);
  const sentences = useRef([]);
  const pageReading = useRef(null);
  const playingRef = useRef(playing);

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

    utterance.lang = "pt-BR";
    utterance.rate = 1;
    utterance.pitch = 1;

    utterance.onend = () => {
      sentenceIndex.current++;
      speakSentence();
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
    console.log("Página recebida no Speech:", pageNumber);

    const page = getPageContent(pageNumber);

    console.log("Conteúdo encontrado no cache:", page);

    if (!page || !page.text || page.text.trim() === "") {
      console.log("PÁGINA SEM TEXTO:", pageNumber);

      if (mode === "landscape" && pageNumber === currentPage && currentPage + 1 <= totalPages) {

        const rightPage = getPageContent(currentPage + 1);

        if (rightPage && rightPage.text && rightPage.text.trim()) {

          console.log("PÁGINA DIREITA DO PAR TEM TEXTO, LENDO:", currentPage + 1);

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
    sentenceIndex.current = Math.min(Math.max(startIndex, 0), sentences.current.length - 1);
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
    }
  }));

  function toggle() {

    if (!speech) { return; }

    if (window.speechSynthesis.speaking) {

      if (window.speechSynthesis.paused) {

        if (pageReading.current !== currentPage) {
          window.speechSynthesis.cancel();
          startReading(currentPage);

        } else {
          window.speechSynthesis.resume();
          playingRef.current = true;
          setPlaying(true);
        }

      } else {
        window.speechSynthesis.pause();
        playingRef.current = false;
        setPlaying(false);
      }

      return;
    }
    startReading(currentPage);
  }

  const toggleRef = useRef(toggle);

  useEffect(() => { toggleRef.current = toggle; });

  useEffect(() => {

    function handler() { toggleRef.current(); }

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
  }, [
    readingPage
  ]);

  useEffect(() => {

    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  return null;
});

export default SpeechControl;
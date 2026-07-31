import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { useSpeech } from "../contexts/SpeechContext";
import { splitText } from "./PageText";

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
  const speakTimeoutRef = useRef(null);
  const generationRef = useRef(0);

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  function clearPendingSpeak() {
    if (speakTimeoutRef.current) {
      clearTimeout(speakTimeoutRef.current);
      speakTimeoutRef.current = null;
    }
  }

  function cancelSpeech() {
    generationRef.current++;
    currentUtterance.current = null;

    const synth = window.speechSynthesis;
    if (!synth) return;

    try {
      synth.cancel();

      if (synth.paused && synth.resume) {
        synth.resume();
      }
    } catch (error) {
      console.warn("Erro ao cancelar speechSynthesis:", error);
    }
  }

  function speakSentence() {
    if (!playingRef.current || pausedRef.current) {
      return;
    }

    if (sentenceIndex.current >= sentences.current.length) {
      onFinishPage(pageReading.current);
      return;
    }

    const index = sentenceIndex.current;
    const generation = generationRef.current;
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
      if (generation !== generationRef.current) {
        return;
      }

      if (!playingRef.current || pausedRef.current) {
        return;
      }

      sentenceIndex.current++;

      clearPendingSpeak();
      speakTimeoutRef.current = setTimeout(() => {
        if (playingRef.current && !pausedRef.current) {
          speakSentence();
        }
      }, 60);
    };

    utterance.onerror = (event) => {
      if (generation !== generationRef.current) {
        return;
      }

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

  function resumeReading() {
    pausedRef.current = false;
    playingRef.current = true;
    setPlaying(true);

    clearPendingSpeak();

    const synth = window.speechSynthesis;
    if (!synth) return;

    try {
      if (synth.paused && synth.resume) {
        synth.resume();
      }
    } catch (error) {
      console.warn("Erro ao resumir speechSynthesis:", error);
    }

    speakTimeoutRef.current = setTimeout(() => {
      if (!playingRef.current || pausedRef.current) {
        return;
      }

      const currentSynth = window.speechSynthesis;

      if (currentSynth.speaking || currentSynth.paused) {
        return;
      }

      speakSentence();
    }, 250);
  }

  async function startReading(pageNumber, startIndex = null) {
    if (!speech) {
      return;
    }

    const samePageAndAlreadyLoaded =
      pageNumber === pageReading.current &&
      startIndex == null &&
      sentences.current.length > 0 &&
      (pausedRef.current || !playingRef.current);

    if (samePageAndAlreadyLoaded) {
      resumeReading();
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

    if (pageNumber !== pageReading.current || startIndex != null) {
      sentences.current = splitText(page.text);
      sentenceIndex.current = Math.max(
        Math.min(Math.max(startIndex ?? 0, 0), sentences.current.length - 1),
        0,
      );
    } else if (sentences.current.length === 0) {
      sentences.current = splitText(page.text);
    }

    pageReading.current = pageNumber;

    setReadingPage(pageNumber);
    pausedRef.current = false;
    playingRef.current = true;
    setPlaying(true);

    clearPendingSpeak();
    cancelSpeech();

    speakTimeoutRef.current = setTimeout(() => {
      if (playingRef.current && !pausedRef.current) {
        speakSentence();
      }
    }, 180);
  }

  useImperativeHandle(ref, () => ({
    seekTo(pageNumber, sentenceIndexValue) {
      clearPendingSpeak();
      cancelSpeech();

      startReading(pageNumber, sentenceIndexValue);
    },
  }));

  function toggle() {
    if (!speech) return;

    if (playingRef.current) {
      playingRef.current = false;
      pausedRef.current = true;
      setPlaying(false);

      clearPendingSpeak();

      const synth = window.speechSynthesis;
      if (synth && synth.pause) {
        try {
          synth.pause();
        } catch (error) {
          console.warn("Erro ao pausar speechSynthesis:", error);
        }
      }

      return;
    }

    if (pausedRef.current) {
      resumeReading();
      return;
    }

    pausedRef.current = false;
    playingRef.current = true;
    setPlaying(true);
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
      if (playingRef.current && !pausedRef.current) {
        clearPendingSpeak();
        speakTimeoutRef.current = setTimeout(() => {
          startReading(readingPage);
        }, 100);
      } else {
        pageReading.current = readingPage;
      }
    }
  }, [readingPage]);

  useEffect(() => {
    return () => {
      clearPendingSpeak();
      cancelSpeech();

      pausedRef.current = false;
    };
  }, []);

  return null;
});

export default SpeechControl;

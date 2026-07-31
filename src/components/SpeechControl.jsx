import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { useSpeech } from "../contexts/SpeechContext";
import { TextToSpeech } from "@capacitor-community/text-to-speech";
import { splitText } from "./PageText";

const SpeechControl = forwardRef(function SpeechControl(
  {
    currentPage,
    getPageContent,
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

  const paragraphIndex = useRef(0);
  const paragraphs = useRef([]);
  const pageReading = useRef(null);
  const playingRef = useRef(playing);
  const pausedRef = useRef(false);
  const speakTimeoutRef = useRef(null);
  const generationRef = useRef(0);
  const useNativeTtsRef = useRef(false);
  const currentPageRef = useRef(currentPage);

  const log = (...args) => {
    console.log("[SpeechControl]", ...args);
  };

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  useEffect(() => {
    useNativeTtsRef.current = isNativeTtsAvailable();
    log("native TTS disponível?", useNativeTtsRef.current);
  }, []);

  function clearPendingSpeak() {
    if (speakTimeoutRef.current) {
      clearTimeout(speakTimeoutRef.current);
      speakTimeoutRef.current = null;
    }
  }

  function isNativeTtsAvailable() {
    return (
      typeof window !== "undefined" &&
      typeof window.Capacitor !== "undefined" &&
      typeof window.Capacitor.isNativePlatform === "function" &&
      window.Capacitor.isNativePlatform()
    );
  }

  function parseRequestedIndex(value) {
    if (value === null || value === undefined) return null;

    if (typeof value === "number" && Number.isFinite(value)) {
      return Math.max(0, Math.floor(value));
    }

    if (typeof value === "string") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return Math.max(0, Math.floor(parsed));
      }
    }

    return null;
  }

  function resolveRequestedSentenceIndex(event) {
    const detail = event?.detail;

    if (detail === null || detail === undefined) {
      return null;
    }

    if (typeof detail === "number" || typeof detail === "string") {
      return parseRequestedIndex(detail);
    }

    if (typeof detail === "object") {
      const candidates = [
        detail.sentenceIndex,
        detail.index,
        detail.paragraphIndex,
        detail.paragraph,
        detail.value,
        detail.id,
      ];

      for (const candidate of candidates) {
        const parsed = parseRequestedIndex(candidate);
        if (parsed !== null) {
          return parsed;
        }
      }
    }

    const dataIndex = event?.target?.dataset?.sentenceIndex;
    const parsedDataIndex = parseRequestedIndex(dataIndex);
    if (parsedDataIndex !== null) {
      return parsedDataIndex;
    }

    return null;
  }

  async function pauseSpeech() {
    if (useNativeTtsRef.current) {
      try {
        await TextToSpeech.pause();
      } catch {}
      return;
    }

    const synth = window.speechSynthesis;
    if (synth && synth.pause) {
      try {
        synth.pause();
      } catch {}
    }
  }

  async function resumeSpeech() {
    if (useNativeTtsRef.current) {
      try {
        await TextToSpeech.resume();
      } catch {}
      return;
    }

    const synth = window.speechSynthesis;
    if (synth && synth.resume) {
      try {
        synth.resume();
      } catch {}
    }
  }

  async function stopSpeech() {
    generationRef.current++;

    if (useNativeTtsRef.current) {
      try {
        await TextToSpeech.stop();
      } catch {}
      return;
    }

    const synth = window.speechSynthesis;
    if (synth && synth.cancel) {
      try {
        synth.cancel();

        if (synth.paused && synth.resume) {
          synth.resume();
        }
      } catch {}
    }
  }

  async function speakParagraph() {
    if (!playingRef.current || pausedRef.current) {
      return;
    }

    if (paragraphIndex.current >= paragraphs.current.length) {
      onFinishPage(pageReading.current);
      return;
    }

    const index = paragraphIndex.current;
    const generation = generationRef.current;
    const text = paragraphs.current[index];

    setActiveSentence(index);

    if (useNativeTtsRef.current) {
      try {
        await TextToSpeech.speak({
          text,
          lang: selectedVoice?.lang ?? "pt-BR",
          rate: 1,
          pitch: 1,
          volume: 1,
        });
      } catch {
        useNativeTtsRef.current = false;
      }

      if (generation !== generationRef.current) {
        return;
      }

      if (!playingRef.current || pausedRef.current) {
        return;
      }

      paragraphIndex.current += 1;

      clearPendingSpeak();
      speakTimeoutRef.current = setTimeout(() => {
        if (playingRef.current && !pausedRef.current) {
          void speakParagraph();
        }
      }, 60);

      return;
    }

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

      paragraphIndex.current += 1;

      clearPendingSpeak();
      speakTimeoutRef.current = setTimeout(() => {
        if (playingRef.current && !pausedRef.current) {
          speakParagraph();
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

    window.speechSynthesis.speak(utterance);
  }

  function startReading(pageNumber, startIndex = 0) {
    if (!speech) {
      return;
    }

    useNativeTtsRef.current = isNativeTtsAvailable();

    const page = getPageContent(pageNumber);

    if (!page || !page.text || !page.text.trim()) {
      if (
        mode === "landscape" &&
        pageNumber === currentPageRef.current &&
        currentPageRef.current + 1 <= totalPages
      ) {
        const rightPage = getPageContent(currentPageRef.current + 1);

        if (rightPage && rightPage.text && rightPage.text.trim()) {
          startReading(currentPageRef.current + 1, 0);
          return;
        }
      }

      playingRef.current = false;
      setPlaying(false);
      return;
    }

    paragraphs.current = splitText(page.text);
    paragraphIndex.current = Math.max(
      Math.min(Math.max(startIndex, 0), paragraphs.current.length - 1),
      0,
    );

    pageReading.current = pageNumber;

    setReadingPage(pageNumber);
    pausedRef.current = false;
    playingRef.current = true;
    setPlaying(true);
    setActiveSentence(paragraphIndex.current);

    clearPendingSpeak();
    void stopSpeech();

    speakTimeoutRef.current = setTimeout(() => {
      if (playingRef.current && !pausedRef.current) {
        void speakParagraph();
      }
    }, 180);
  }

  function resumeReading() {
    pausedRef.current = false;
    playingRef.current = true;
    setPlaying(true);

    clearPendingSpeak();

    if (!pageReading.current) {
      return;
    }

    const page = getPageContent(pageReading.current);

    if (!page || !page.text || !page.text.trim()) {
      return;
    }

    if (!paragraphs.current.length) {
      paragraphs.current = splitText(page.text);
    }

    paragraphIndex.current = Math.min(
      Math.max(paragraphIndex.current, 0),
      paragraphs.current.length - 1,
    );

    setActiveSentence(paragraphIndex.current);

    speakTimeoutRef.current = setTimeout(() => {
      if (playingRef.current && !pausedRef.current) {
        void speakParagraph();
      }
    }, 180);
  }

  function toggle() {
    if (!speech) {
      return;
    }

    if (playingRef.current) {
      playingRef.current = false;
      pausedRef.current = true;
      setPlaying(false);

      clearPendingSpeak();
      void pauseSpeech();

      return;
    }

    if (pausedRef.current) {
      void resumeSpeech();
      resumeReading();
      return;
    }

    startReading(currentPageRef.current);
  }

  useImperativeHandle(ref, () => ({
    seekTo(pageNumber, paragraphIndexValue) {
      clearPendingSpeak();
      void stopSpeech();

      startReading(pageNumber, paragraphIndexValue);
    },
  }));

  const toggleRef = useRef(toggle);

  useEffect(() => {
    toggleRef.current = toggle;
  });

  useEffect(() => {
    function handler(event) {
      const requestedIndex = resolveRequestedSentenceIndex(event);

      if (requestedIndex !== null) {
        const safeIndex = Math.max(0, requestedIndex);
        paragraphIndex.current = safeIndex;
        setActiveSentence(safeIndex);
        startReading(currentPageRef.current, safeIndex);
        return;
      }

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
          startReading(readingPage, 0);
        }, 100);
      } else {
        pageReading.current = readingPage;
      }
    }
  }, [readingPage]);

  useEffect(() => {
    return () => {
      clearPendingSpeak();
      void stopSpeech();
      pausedRef.current = false;
    };
  }, []);

  return null;
});

export default SpeechControl;

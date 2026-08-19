import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { TextToSpeech } from "@capacitor-community/text-to-speech";

function splitIntoSentences(text: string): string[] {
  if (!text) return [];

  const result: string[] = [];

  for (const rawParagraph of text.split(/\n{2,}/)) {
    const trimmed = rawParagraph.trim();

    if (!trimmed) continue;

    if (trimmed.startsWith("@@") && trimmed.endsWith("@@")) {
      const clean = trimmed.slice(2, -2).trim();

      if (clean) result.push(clean);

      continue;
    }

    const parts = trimmed
      .split(/(?<=[.!?])\s+/)
      .map((item) => item.trim())
      .filter(Boolean);

    result.push(...parts);
  }

  return result;
}

function getParagraphIndexForSentenceIndex(
  text: string,
  sentenceIndex: number,
): number {
  if (!text || sentenceIndex < 0) return 0;

  const paragraphs = text.split(/\n{2,}/);

  let globalIndex = 0;
  let paragraphIndex = 0;

  for (const rawParagraph of paragraphs) {
    const trimmed = rawParagraph.trim();

    if (!trimmed) continue;

    const isHeading = trimmed.startsWith("@@") && trimmed.endsWith("@@");

    const cleanText = isHeading ? trimmed.slice(2, -2).trim() : trimmed;

    if (!cleanText) continue;

    const count = isHeading
      ? 1
      : cleanText
          .split(/(?<=[.!?])\s+/)
          .map((item) => item.trim())
          .filter(Boolean).length;

    if (sentenceIndex >= globalIndex && sentenceIndex < globalIndex + count) {
      return paragraphIndex;
    }

    globalIndex += count;
    paragraphIndex++;
  }

  return Math.max(0, paragraphIndex - 1);
}

function getSentenceIndexForParagraphIndex(
  text: string,
  paragraphIndex: number,
): number {
  if (!text || paragraphIndex <= 0) return 0;

  const paragraphs = text.split(/\n{2,}/);

  let sentenceIndex = 0;
  let currentParagraph = 0;

  for (const rawParagraph of paragraphs) {
    const trimmed = rawParagraph.trim();

    if (!trimmed) continue;

    const isHeading = trimmed.startsWith("@@") && trimmed.endsWith("@@");

    const cleanText = isHeading ? trimmed.slice(2, -2).trim() : trimmed;

    if (!cleanText) continue;

    if (currentParagraph === paragraphIndex) {
      return sentenceIndex;
    }

    const count = isHeading
      ? 1
      : cleanText
          .split(/(?<=[.!?])\s+/)
          .map((item) => item.trim())
          .filter(Boolean).length;

    sentenceIndex += count;
    currentParagraph++;
  }

  return sentenceIndex;
}

function parseIndex(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value));
  }

  if (typeof value === "string") {
    const number = Number(value);

    if (Number.isFinite(number)) {
      return Math.max(0, Math.floor(number));
    }
  }

  return null;
}

type SpeechControlMobileProps = {
  currentPage: number;
  getPageContent: (pageNumber: number) => any;
  mode: string;
  totalPages: number;
  playing: boolean;
  setPlaying: (value: boolean) => void;
  readingPage: number | null;
  setReadingPage: (value: number | null) => void;
  setActiveSentence: (value: number | null) => void;
  onFinishPage: (pageNumber: number) => void | Promise<void>;
  speech?: boolean;
  selectedVoice?: SpeechSynthesisVoice | null;
};

export type SpeechControlMobileHandle = {
  seekTo: (pageNumber: number, sentenceIndex: number) => void;
};

const SpeechControlMobile = forwardRef<
  SpeechControlMobileHandle,
  SpeechControlMobileProps
>(function SpeechControlMobile(
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
  const sentencesRef = useRef<string[]>([]);
  const sentenceIndexRef = useRef(0);
  const pageReadingRef = useRef<number | null>(null);
  const currentPageRef = useRef(currentPage);
  const playingRef = useRef(playing);
  const pausedRef = useRef(false);
  const sessionRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  function clearTimer() {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function updateActiveSentence(sentenceIndex: number, pageText: string) {
    const paragraphIndex = getParagraphIndexForSentenceIndex(
      pageText,
      sentenceIndex,
    );

    setActiveSentence(paragraphIndex);
  }

  async function stopSpeech() {
    try {
      await TextToSpeech.stop();
    } catch {}
  }

  async function speakSentence(sessionId: number, startIndex = 0) {
    if (
      sessionId !== sessionRef.current ||
      !playingRef.current ||
      pausedRef.current
    ) {
      return;
    }

    const sentences = sentencesRef.current;

    if (sentenceIndexRef.current >= sentences.length) {
      setActiveSentence(null);

      const page = pageReadingRef.current;

      if (page !== null) {
        await onFinishPage(page);
      }

      return;
    }

    const sentenceIndex = sentenceIndexRef.current;
    const sentence = sentences[sentenceIndex];

    if (!sentence) {
      sentenceIndexRef.current++;

      await speakSentence(sessionId, 0);

      return;
    }

    const safeIndex = Math.min(
      Math.max(startIndex, 0),
      Math.max(sentence.length - 1, 0),
    );

    const text = safeIndex > 0 ? sentence.slice(safeIndex) : sentence;

    const pageNumber = pageReadingRef.current ?? currentPageRef.current;

    const page = getPageContent(pageNumber);

    updateActiveSentence(sentenceIndex, page?.text || "");

    try {
      await TextToSpeech.speak({
        text,
        lang: "pt-BR",
        rate: 1,
        pitch: 1,
        volume: 1,
        queueStrategy: 0,
      });

      if (
        sessionId !== sessionRef.current ||
        !playingRef.current ||
        pausedRef.current
      ) {
        return;
      }

      sentenceIndexRef.current++;

      if (sentenceIndexRef.current < sentences.length) {
        clearTimer();

        timerRef.current = setTimeout(() => {
          timerRef.current = null;

          void speakSentence(sessionId, 0);
        }, 80);

        return;
      }

      setActiveSentence(null);

      const finishedPage = pageReadingRef.current;

      if (finishedPage !== null) {
        await onFinishPage(finishedPage);
      }
    } catch {
      if (sessionId !== sessionRef.current || pausedRef.current) {
        return;
      }

      playingRef.current = false;

      setPlaying(false);
      setActiveSentence(null);
    }
  }

  async function startReading(pageNumber: number, startSentenceIndex = 0) {
    const page = getPageContent(pageNumber);

    if (!page?.text?.trim()) {
      if (
        mode === "landscape" &&
        pageNumber === currentPageRef.current &&
        currentPageRef.current + 1 <= totalPages
      ) {
        const nextPage = currentPageRef.current + 1;

        const nextContent = getPageContent(nextPage);

        if (nextContent?.text?.trim()) {
          await startReading(nextPage, 0);

          return;
        }
      }

      await stopSpeech();

      playingRef.current = false;
      pausedRef.current = false;

      setPlaying(false);
      setActiveSentence(null);

      return;
    }

    const sentences = splitIntoSentences(page.text);

    if (!sentences.length) {
      setPlaying(false);
      setActiveSentence(null);
      return;
    }

    clearTimer();

    await stopSpeech();

    sessionRef.current++;

    const sessionId = sessionRef.current;

    sentencesRef.current = sentences;

    sentenceIndexRef.current = Math.min(
      Math.max(0, Math.floor(startSentenceIndex)),
      sentences.length - 1,
    );

    pageReadingRef.current = pageNumber;

    pausedRef.current = false;
    playingRef.current = true;

    setReadingPage(pageNumber);
    setPlaying(true);

    updateActiveSentence(sentenceIndexRef.current, page.text);

    void speakSentence(sessionId, 0);
  }

  async function pauseReading() {
    if (!playingRef.current) {
      return;
    }

    playingRef.current = false;
    pausedRef.current = true;

    clearTimer();

    setPlaying(false);

    await stopSpeech();
  }

  async function resumeReading() {
    const pageNumber = pageReadingRef.current;

    if (pageNumber === null) {
      await startReading(currentPageRef.current, 0);

      return;
    }

    const page = getPageContent(pageNumber);

    if (!page?.text?.trim()) {
      return;
    }

    if (!sentencesRef.current.length) {
      sentencesRef.current = splitIntoSentences(page.text);
    }

    const sentenceIndex = Math.min(
      Math.max(0, sentenceIndexRef.current),
      sentencesRef.current.length - 1,
    );

    sessionRef.current++;

    const sessionId = sessionRef.current;

    pausedRef.current = false;
    playingRef.current = true;

    setPlaying(true);

    updateActiveSentence(sentenceIndex, page.text);

    await stopSpeech();

    void speakSentence(sessionId, 0);
  }

  function toggle() {
    if (playingRef.current) {
      void pauseReading();
      return;
    }

    if (pausedRef.current) {
      void resumeReading();
      return;
    }

    void startReading(currentPageRef.current, 0);
  }

  useImperativeHandle(
    ref,
    () => ({
      seekTo(pageNumber, sentenceIndex) {
        clearTimer();

        sessionRef.current++;

        pausedRef.current = false;
        playingRef.current = true;

        setPlaying(true);

        void stopSpeech().finally(() => {
          void startReading(pageNumber, sentenceIndex);
        });
      },
    }),
    [
      getPageContent,
      mode,
      totalPages,
      setPlaying,
      setReadingPage,
      setActiveSentence,
      onFinishPage,
    ],
  );

  const toggleRef = useRef(toggle);

  useEffect(() => {
    toggleRef.current = toggle;
  });

  useEffect(() => {
    function handleSpeechEvent(event: Event) {
      const customEvent = event as CustomEvent;

      const detail = customEvent.detail;

      if (detail !== null && detail !== undefined) {
        if (typeof detail === "number" || typeof detail === "string") {
          const index = parseIndex(detail);

          if (index !== null) {
            void startReading(currentPageRef.current, index);

            return;
          }
        }

        if (typeof detail === "object") {
          const index = parseIndex(
            detail.sentenceIndex ?? detail.index ?? detail.value ?? detail.id,
          );

          if (index !== null) {
            void startReading(currentPageRef.current, index);

            return;
          }

          const paragraph = parseIndex(
            detail.paragraphIndex ?? detail.paragraph,
          );

          if (paragraph !== null) {
            const page = getPageContent(currentPageRef.current);

            const sentenceIndex = getSentenceIndexForParagraphIndex(
              page?.text || "",
              paragraph,
            );

            void startReading(currentPageRef.current, sentenceIndex);

            return;
          }
        }
      }

      toggleRef.current();
    }

    document.addEventListener("toggle-reader-speech", handleSpeechEvent);

    return () => {
      document.removeEventListener("toggle-reader-speech", handleSpeechEvent);
    };
  }, [getPageContent]);

  useEffect(() => {
    if (readingPage !== null && readingPage !== pageReadingRef.current) {
      if (playingRef.current && !pausedRef.current) {
        void startReading(readingPage, 0);
      } else {
        pageReadingRef.current = readingPage;
      }
    }
  }, [readingPage]);

  useEffect(() => {
    return () => {
      clearTimer();

      sessionRef.current++;

      pausedRef.current = false;
      playingRef.current = false;

      void TextToSpeech.stop().catch(() => {});
    };
  }, []);

  return null;
});

export default SpeechControlMobile;

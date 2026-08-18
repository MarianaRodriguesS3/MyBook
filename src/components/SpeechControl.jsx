import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { useSpeech } from "../contexts/SpeechContext";
import { TextToSpeech } from "@capacitor-community/text-to-speech";

/* ==========================================================================
   FUNÇÕES UTILITÁRIAS DE TEXTO E CONVERSÃO DE ÍNDICES
   ========================================================================== */

// 🟢 Mesmo critério de parágrafo do PageText.jsx: só quebra em \n{2,}
// (duas ou mais quebras de linha = parágrafo de verdade). Usar /\n+/
// aqui (como nas versões anteriores) faz cada linha da extração do PDF
// virar um "parágrafo" próprio, o que já causou bug de resume voltando
// pro início errado — por isso as 3 funções abaixo (split e as duas
// conversões) usam TODAS o mesmo /\n{2,}/, senão os índices de uma não
// batem com os índices da outra.
function splitIntoParagraphs(text) {
  if (!text) return [];

  return text
    .split(/\n{2,}/)
    .map((item) => item.replace(/@@/g, "").trim())
    .filter(Boolean);
}

// Divide o texto em frases individuais — mesma lógica usada pelo
// PageText pra desenhar/destacar cada frase clicável.
export function splitIntoSentences(text) {
  if (!text) return [];

  const result = [];

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
      .map((s) => s.trim())
      .filter(Boolean);

    result.push(...parts);
  }

  return result;
}

// Dado um índice GLOBAL de frase (o mesmo que PageText usa pra
// destacar/clicar cada frase), devolve o índice do parágrafo que a
// contém — usado quando o clique manda uma frase e precisamos saber
// de qual parágrafo começar a falar.
export function getParagraphIndexForSentenceIndex(text, sentenceIndex) {
  if (!text || sentenceIndex == null || sentenceIndex < 0) return 0;

  const rawParagraphs = text.split(/\n{2,}/);
  let globalSentenceIdx = 0;
  let paragraphCursor = 0;

  for (const rawParagraph of rawParagraphs) {
    const trimmed = rawParagraph.trim();
    if (!trimmed) continue;

    const isHeading = trimmed.startsWith("@@") && trimmed.endsWith("@@");
    const cleanText = isHeading ? trimmed.slice(2, -2).trim() : trimmed;
    if (!cleanText) continue;

    const count = isHeading
      ? 1
      : cleanText.split(/(?<=[.!?])\s+/).filter(Boolean).length;

    if (
      sentenceIndex >= globalSentenceIdx &&
      sentenceIndex < globalSentenceIdx + count
    ) {
      return paragraphCursor;
    }

    globalSentenceIdx += count;
    paragraphCursor++;
  }

  return Math.max(0, paragraphCursor - 1);
}

// Caminho inverso: dado um índice de PARÁGRAFO, devolve o índice
// global da primeira frase daquele parágrafo. Necessário pra quando o
// clique manda um índice de parágrafo (não de frase) — sem essa
// conversão, um índice de parágrafo pequeno era interpretado como se
// fosse a N-ésima frase da página inteira, apontando pro parágrafo
// errado (a causa do bug "clica aqui, grifa lá").
export function getSentenceIndexForParagraphIndex(text, paragraphIndex) {
  if (!text || paragraphIndex == null || paragraphIndex <= 0) return 0;

  const rawParagraphs = text.split(/\n{2,}/);
  let globalSentenceIdx = 0;
  let paragraphCursor = 0;

  for (const rawParagraph of rawParagraphs) {
    const trimmed = rawParagraph.trim();
    if (!trimmed) continue;

    const isHeading = trimmed.startsWith("@@") && trimmed.endsWith("@@");
    const cleanText = isHeading ? trimmed.slice(2, -2).trim() : trimmed;
    if (!cleanText) continue;

    if (paragraphCursor === paragraphIndex) {
      return globalSentenceIdx;
    }

    const count = isHeading
      ? 1
      : cleanText.split(/(?<=[.!?])\s+/).filter(Boolean).length;

    globalSentenceIdx += count;
    paragraphCursor++;
  }

  return globalSentenceIdx;
}

function estimateDurationMs(text) {
  return Math.max(900, text.length * 70);
}

/* ==========================================================================
   COMPONENTE PRINCIPAL: SpeechControl
   ========================================================================== */

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
  const useNativeTtsRef = useRef(false);
  const currentPageRef = useRef(currentPage);

  // 🟢 Controle de sessão: cada chamada de startReading gera um novo
  // sessionId. Callbacks assíncronos (onend, promises do TTS nativo)
  // só têm efeito se ainda pertencerem à sessão atual — evita que uma
  // fala "atrasada" de uma leitura antiga interfira numa nova (troca
  // rápida de página, por exemplo).
  const playbackSessionRef = useRef(0);
  const speechActiveRef = useRef(false);

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  useEffect(() => {
    useNativeTtsRef.current = isNativeTtsAvailable();
  }, []);

  function clearPendingSpeak() {
    if (speakTimeoutRef.current) {
      clearTimeout(speakTimeoutRef.current);
      speakTimeoutRef.current = null;
    }
  }

  function resetPlaybackState() {
    clearPendingSpeak();
    pausedRef.current = false;
    playingRef.current = false;
    speechActiveRef.current = false;
    setPlaying(false);
    setActiveSentence(null);
  }

  function nextPlaybackSession() {
    playbackSessionRef.current += 1;
    return playbackSessionRef.current;
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

  // 🟢 Diferencia explicitamente candidatos que são índice de FRASE
  // (retornados direto) dos que são índice de PARÁGRAFO (convertidos
  // via getSentenceIndexForParagraphIndex antes de retornar). Antes
  // isso tudo caía numa lista única sem distinção de unidade — é
  // exatamente essa mistura que causava clicar num lugar e destacar
  // outro.
  function resolveRequestedSentenceIndex(event) {
    const detail = event?.detail;
    const page = getPageContent(currentPageRef.current);
    const pageText = page?.text || "";

    if (detail !== null && detail !== undefined) {
      if (typeof detail === "number" || typeof detail === "string") {
        // valor "cru" sem contexto: assume índice de frase (comportamento antigo)
        return parseRequestedIndex(detail);
      }

      if (typeof detail === "object") {
        const sentenceCandidate = parseRequestedIndex(
          detail.sentenceIndex ?? detail.index ?? detail.value ?? detail.id,
        );
        if (sentenceCandidate !== null) {
          return sentenceCandidate;
        }

        const paragraphCandidate = parseRequestedIndex(
          detail.paragraphIndex ?? detail.paragraph,
        );
        if (paragraphCandidate !== null) {
          return getSentenceIndexForParagraphIndex(
            pageText,
            paragraphCandidate,
          );
        }
      }
    }

    const target = event?.target;
    if (target) {
      const sentenceAttr =
        target.dataset?.sentenceIndex ??
        target.getAttribute?.("data-sentence-index");
      const sentenceFromAttr = parseRequestedIndex(sentenceAttr);
      if (sentenceFromAttr !== null) {
        return sentenceFromAttr;
      }

      const paragraphAttr =
        target.dataset?.paragraphIndex ??
        target.getAttribute?.("data-paragraph-index");
      const paragraphFromAttr = parseRequestedIndex(paragraphAttr);
      if (paragraphFromAttr !== null) {
        return getSentenceIndexForParagraphIndex(pageText, paragraphFromAttr);
      }
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

    const synth = typeof window !== "undefined" ? window.speechSynthesis : null;
    if (synth?.pause) {
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

    const synth = typeof window !== "undefined" ? window.speechSynthesis : null;
    if (synth?.resume) {
      try {
        synth.resume();
      } catch {}
    }
  }

  async function stopSpeech() {
    if (useNativeTtsRef.current) {
      try {
        await TextToSpeech.stop();
      } catch {}
      return;
    }

    const synth = typeof window !== "undefined" ? window.speechSynthesis : null;
    if (synth?.cancel) {
      try {
        synth.cancel();
      } catch {}
    }
  }

  function scheduleNextParagraph(sessionId, delay = 120) {
    if (
      sessionId !== playbackSessionRef.current ||
      !playingRef.current ||
      pausedRef.current
    ) {
      return;
    }

    paragraphIndex.current += 1;
    speechActiveRef.current = false;

    if (paragraphIndex.current >= paragraphs.current.length) {
      clearPendingSpeak();
      pausedRef.current = false;
      setActiveSentence(null);
      onFinishPage(pageReading.current);
      return;
    }

    clearPendingSpeak();
    speakTimeoutRef.current = setTimeout(() => {
      if (
        sessionId === playbackSessionRef.current &&
        playingRef.current &&
        !pausedRef.current
      ) {
        void speakParagraph(sessionId);
      }
    }, delay);
  }

  async function speakParagraph(sessionId = playbackSessionRef.current) {
    if (
      sessionId !== playbackSessionRef.current ||
      !playingRef.current ||
      pausedRef.current
    ) {
      return;
    }

    if (paragraphIndex.current >= paragraphs.current.length) {
      if (sessionId !== playbackSessionRef.current) return;

      clearPendingSpeak();
      pausedRef.current = false;
      setActiveSentence(null);
      onFinishPage(pageReading.current);
      return;
    }

    const index = paragraphIndex.current;
    const text = paragraphs.current[index];

    speechActiveRef.current = true;

    if (!text) {
      clearPendingSpeak();
      pausedRef.current = false;
      setActiveSentence(null);
      onFinishPage(pageReading.current);
      return;
    }

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

      if (
        sessionId !== playbackSessionRef.current ||
        !playingRef.current ||
        pausedRef.current
      ) {
        return;
      }

      scheduleNextParagraph(sessionId, estimateDurationMs(text) + 200);
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
      if (
        sessionId !== playbackSessionRef.current ||
        !playingRef.current ||
        pausedRef.current
      ) {
        return;
      }

      scheduleNextParagraph(sessionId, 0);
    };

    utterance.onerror = (event) => {
      if (event.error === "canceled" || event.error === "interrupted") {
        return;
      }

      resetPlaybackState();
    };

    const synth = typeof window !== "undefined" ? window.speechSynthesis : null;
    if (synth?.speak) {
      synth.speak(utterance);
    } else {
      resetPlaybackState();
    }
  }

  // Início "do zero": troca de página, clique numa frase, primeiro
  // play. startIndex é sempre um índice GLOBAL DE FRASE (nunca de
  // parágrafo) — quem chama isso já deve ter feito a conversão certa
  // via getSentenceIndexForParagraphIndex, se necessário.
  function startReading(pageNumber, startIndex = 0) {
    if (!speech) return;

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

      clearPendingSpeak();
      void stopSpeech();
      resetPlaybackState();
      return;
    }

    const normalizedParagraphs = splitIntoParagraphs(page.text);
    paragraphs.current = normalizedParagraphs;
    const sessionId = nextPlaybackSession();

    const paragraphStartIndex =
      normalizedParagraphs.length &&
      Number.isInteger(startIndex) &&
      startIndex >= 0
        ? getParagraphIndexForSentenceIndex(page.text, startIndex)
        : 0;

    paragraphIndex.current = normalizedParagraphs.length
      ? Math.min(
          Math.max(paragraphStartIndex, 0),
          normalizedParagraphs.length - 1,
        )
      : 0;

    pageReading.current = pageNumber;

    setReadingPage(pageNumber);
    pausedRef.current = false;
    playingRef.current = true;
    setPlaying(true);
    setActiveSentence(paragraphIndex.current);

    clearPendingSpeak();

    // 🟢 Espera o stop terminar de verdade antes de agendar a próxima
    // fala — sem isso (stop "fire-and-forget"), o speak() seguinte
    // pode ser disparado em cima de um stop ainda em andamento e ser
    // ignorado silenciosamente pelo motor de fala, principalmente em
    // mobile.
    (async () => {
      await stopSpeech();

      speakTimeoutRef.current = setTimeout(() => {
        if (
          sessionId === playbackSessionRef.current &&
          playingRef.current &&
          !pausedRef.current
        ) {
          void speakParagraph(sessionId);
        }
      }, 180);
    })();
  }

  function resumeReading() {
    pausedRef.current = false;
    playingRef.current = true;
    setPlaying(true);

    clearPendingSpeak();

    if (!pageReading.current) return;

    const page = getPageContent(pageReading.current);
    if (!page || !page.text || !page.text.trim()) return;

    if (!paragraphs.current.length) {
      paragraphs.current = splitIntoParagraphs(page.text);
    }

    paragraphIndex.current = Math.min(
      Math.max(paragraphIndex.current, 0),
      paragraphs.current.length - 1,
    );

    setActiveSentence(paragraphIndex.current);

    // Se a fala ainda estava "ativa" (só pausada de verdade via
    // pause()), retoma a MESMA utterance no ponto exato — sem
    // recriar nada. Só recomeça o parágrafo do zero se, por algum
    // motivo, nada estava tocando quando pausou.
    if (speechActiveRef.current) {
      void resumeSpeech();
      return;
    }

    const sessionId = playbackSessionRef.current;
    speakTimeoutRef.current = setTimeout(() => {
      if (
        sessionId === playbackSessionRef.current &&
        playingRef.current &&
        !pausedRef.current
      ) {
        void speakParagraph(sessionId);
      }
    }, 180);
  }

  function toggle() {
    if (!speech) return;

    if (playingRef.current) {
      playingRef.current = false;
      pausedRef.current = true;
      setPlaying(false);

      clearPendingSpeak();
      void pauseSpeech();
      return;
    }

    if (pausedRef.current) {
      resumeReading();
      return;
    }

    startReading(currentPageRef.current);
  }

  useImperativeHandle(ref, () => ({
    // sentenceIndexValue: índice GLOBAL DE FRASE, o mesmo que
    // PageText usa pra destacar/pesquisar. Se quem chama isso só tem
    // um índice de PARÁGRAFO, converte com getSentenceIndexForParagraphIndex
    // antes de chamar — nunca passe um índice de parágrafo direto aqui.
    seekTo(pageNumber, sentenceIndexValue) {
      const synth =
        typeof window !== "undefined" ? window.speechSynthesis : null;

      if (synth && (synth.speaking || synth.paused)) {
        try {
          synth.cancel();
        } catch {}
      }

      startReading(pageNumber, sentenceIndexValue);
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
        startReading(readingPage, 0);
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

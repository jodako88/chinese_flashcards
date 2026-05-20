import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { getKnownVocabPinyin, updateCardSentence } from '../lib/db';

const DEFAULT_MODEL = 'deepseek-chat';
const EMPTY_SENTENCE = {
  example_pinyin: '',
  example_english: '',
};

function getCachedSentence(card, localCache) {
  if (!card) {
    return EMPTY_SENTENCE;
  }

  if (localCache[card.id]) {
    return localCache[card.id];
  }

  return {
    example_pinyin: card.example_pinyin ?? '',
    example_english: card.example_english ?? '',
  };
}

function hasSentence(sentence) {
  return Boolean(sentence.example_pinyin || sentence.example_english);
}

function getFriendlyError(error) {
  if (error.isUnavailable || error instanceof TypeError) {
    return 'Sentence generation is unavailable. You can keep reviewing cached card content.';
  }

  return error.message || 'Could not generate an example sentence.';
}

function createUnavailableError() {
  const error = new Error('Sentence generation is unavailable.');

  error.isUnavailable = true;

  return error;
}

export function getTargetWordParts(examplePinyin, targetPinyin) {
  if (!examplePinyin || !targetPinyin) {
    return [];
  }

  const matchIndex = examplePinyin.indexOf(targetPinyin);

  if (matchIndex === -1) {
    return [{ text: examplePinyin, isTarget: false }];
  }

  return [
    { text: examplePinyin.slice(0, matchIndex), isTarget: false },
    { text: targetPinyin, isTarget: true },
    { text: examplePinyin.slice(matchIndex + targetPinyin.length), isTarget: false },
  ].filter((part) => part.text);
}

export function useSentence({ card, isEnabled, model = DEFAULT_MODEL }) {
  const [sentenceCache, setSentenceCache] = useState({});
  const [sentence, setSentence] = useState(EMPTY_SENTENCE);
  const [error, setError] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUnavailable, setIsUnavailable] = useState(false);
  const currentCardIdRef = useRef(null);
  const autoRequestedCardIdsRef = useRef(new Set());

  const cachedSentence = useMemo(
    () => getCachedSentence(card, sentenceCache),
    [card, sentenceCache],
  );

  const generateSentence = useCallback(
    async ({ force = false } = {}) => {
      if (!card || isGenerating) {
        return;
      }

      const availableSentence = getCachedSentence(card, sentenceCache);

      if (!force && hasSentence(availableSentence)) {
        setSentence(availableSentence);
        return;
      }

      setIsGenerating(true);
      setError('');
      setIsUnavailable(false);

      try {
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
          throw createUnavailableError();
        }

        const knownVocab = await getKnownVocabPinyin();
        const response = await fetch('/.netlify/functions/generate-sentence', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            pinyin: card.pinyin,
            english: card.english,
            knownVocab,
            model,
          }),
        });

        if (!response.ok) {
          let message = 'Could not generate an example sentence.';

          if ([404, 405, 502, 503, 504].includes(response.status)) {
            throw createUnavailableError();
          }

          try {
            const errorBody = await response.json();
            message = errorBody.error || message;
          } catch {
            // Keep the friendly fallback message when the function returns non-JSON.
          }

          throw new Error(message);
        }

        const generatedSentence = await response.json();
        const nextSentence = {
          example_pinyin: String(generatedSentence.example_pinyin ?? '').trim(),
          example_english: String(generatedSentence.example_english ?? '').trim(),
        };

        if (!nextSentence.example_pinyin || !nextSentence.example_english) {
          throw new Error('The generated sentence was incomplete.');
        }

        await updateCardSentence(card.id, nextSentence.example_pinyin, nextSentence.example_english);

        setSentenceCache((currentCache) => ({
          ...currentCache,
          [card.id]: nextSentence,
        }));

        if (currentCardIdRef.current === card.id) {
          setSentence(nextSentence);
        }
      } catch (generationError) {
        if (currentCardIdRef.current === card.id) {
          const message = getFriendlyError(generationError);

          setError(message);
          setIsUnavailable(Boolean(generationError.isUnavailable) || generationError instanceof TypeError);
        }
      } finally {
        if (currentCardIdRef.current === card.id) {
          setIsGenerating(false);
        }
      }
    },
    [card, isGenerating, model, sentenceCache],
  );

  useEffect(() => {
    currentCardIdRef.current = card?.id ?? null;
    setSentence(cachedSentence);
    setError('');
    setIsUnavailable(false);
    setIsGenerating(false);
  }, [card?.id, cachedSentence]);

  useEffect(() => {
    if (
      card &&
      isEnabled &&
      !hasSentence(cachedSentence) &&
      !autoRequestedCardIdsRef.current.has(card.id)
    ) {
      autoRequestedCardIdsRef.current.add(card.id);
      void generateSentence();
    }
  }, [cachedSentence, card, generateSentence, isEnabled]);

  return {
    error,
    exampleEnglish: sentence.example_english,
    examplePinyinParts: getTargetWordParts(sentence.example_pinyin, card?.pinyin),
    hasSentence: hasSentence(sentence),
    isGenerating,
    isUnavailable,
    regenerateSentence: () => generateSentence({ force: true }),
  };
}

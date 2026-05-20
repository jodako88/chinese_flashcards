import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  getLearningCardsDueToday,
  getNewCards,
  getReviewCardsDueToday,
  suspendCard,
  updateSrsState,
} from '../lib/db';
import { buildSessionQueue, calculateNextSrsState } from '../lib/srsAlgorithm';

const DEFAULT_NEW_CARD_LIMIT = 20;
const DEFAULT_DIRECTION = 'random';
const INITIAL_STATS = {
  again: 0,
  hard: 0,
  good: 0,
  easy: 0,
  markedKnown: 0,
  newCardsGraduated: 0,
  totalReviewed: 0,
};

function getTodayDateString() {
  const now = new Date();
  const localTime = now.getTime() - now.getTimezoneOffset() * 60_000;

  return new Date(localTime).toISOString().slice(0, 10);
}

function pickRandomStudyDirection() {
  return Math.random() < 0.5 ? 'py-en' : 'en-py';
}

function getNextQueue(queue, card, rating, nextSrsState) {
  const remainingQueue = queue.slice(1);

  if (rating === 'again') {
    return [
      ...remainingQueue,
      {
        ...card,
        srs_state: nextSrsState,
      },
    ];
  }

  return remainingQueue;
}

function isNewCardGraduated(card, rating) {
  return card?.srs_state?.state === 'new' && ['hard', 'good', 'easy'].includes(rating);
}

export function useSession({
  defaultDirection = DEFAULT_DIRECTION,
  isEnabled = true,
  newCardLimit = DEFAULT_NEW_CARD_LIMIT,
} = {}) {
  const [queue, setQueue] = useState([]);
  const [initialQueueLength, setInitialQueueLength] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [direction, setDirection] = useState(defaultDirection);
  const [randomDirection, setRandomDirection] = useState(pickRandomStudyDirection);
  const [stats, setStats] = useState(INITIAL_STATS);
  const [isComplete, setIsComplete] = useState(false);

  const currentCard = queue[0] ?? null;
  const activeDirection = direction === 'random' ? randomDirection : direction;
  const studiedCount = Math.max(0, initialQueueLength - queue.length + (currentCard ? 1 : 0));

  const progress = useMemo(
    () => ({
      current: initialQueueLength === 0 ? 0 : Math.min(studiedCount, initialQueueLength),
      total: initialQueueLength,
    }),
    [initialQueueLength, studiedCount],
  );

  const loadSession = useCallback(async () => {
    if (!isEnabled) {
      return;
    }

    setIsLoading(true);
    setError('');
    setIsComplete(false);
    setIsAnswerRevealed(false);
    setDirection(defaultDirection);
    setStats(INITIAL_STATS);
    setRandomDirection(pickRandomStudyDirection());

    try {
      const [reviewCards, learningCards, newCards] = await Promise.all([
        getReviewCardsDueToday(),
        getLearningCardsDueToday(),
        getNewCards(newCardLimit),
      ]);
      const sessionQueue = buildSessionQueue(reviewCards, learningCards, newCards);

      setQueue(sessionQueue);
      setInitialQueueLength(sessionQueue.length);
      setIsComplete(sessionQueue.length === 0);
    } catch (loadError) {
      setError(loadError.message || 'Unable to load the study session.');
      setQueue([]);
      setInitialQueueLength(0);
    } finally {
      setIsLoading(false);
    }
  }, [defaultDirection, isEnabled, newCardLimit]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  function revealAnswer() {
    setIsAnswerRevealed(true);
  }

  function chooseDirection(nextDirection) {
    setDirection(nextDirection);

    if (nextDirection === 'random') {
      setRandomDirection(pickRandomStudyDirection());
    }
  }

  function advanceQueue(nextQueue) {
    setQueue(nextQueue);
    setIsAnswerRevealed(false);
    setRandomDirection(pickRandomStudyDirection());

    if (nextQueue.length === 0) {
      setIsComplete(true);
    }
  }

  async function rateCurrentCard(rating) {
    if (!currentCard || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const currentDate = getTodayDateString();
      const nextSrsState = calculateNextSrsState(currentCard.srs_state, rating, currentDate);

      await updateSrsState(currentCard.id, nextSrsState);

      setStats((currentStats) => ({
        ...currentStats,
        [rating]: currentStats[rating] + 1,
        newCardsGraduated: currentStats.newCardsGraduated + (isNewCardGraduated(currentCard, rating) ? 1 : 0),
        totalReviewed: currentStats.totalReviewed + 1,
      }));
      advanceQueue(getNextQueue(queue, currentCard, rating, nextSrsState));
    } catch (ratingError) {
      setError(ratingError.message || 'Unable to save this review.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function markCurrentCardAsKnown() {
    if (!currentCard || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await suspendCard(currentCard.id);

      setStats((currentStats) => ({
        ...currentStats,
        markedKnown: currentStats.markedKnown + 1,
        totalReviewed: currentStats.totalReviewed + 1,
      }));
      advanceQueue(queue.slice(1));
    } catch (knownError) {
      setError(knownError.message || 'Unable to mark this card as known.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return {
    activeDirection,
    chooseDirection,
    currentCard,
    direction,
    error,
    isAnswerRevealed,
    isComplete,
    isLoading,
    isSubmitting,
    markCurrentCardAsKnown,
    progress,
    queueLength: queue.length,
    rateCurrentCard,
    reloadSession: loadSession,
    revealAnswer,
    stats,
  };
}

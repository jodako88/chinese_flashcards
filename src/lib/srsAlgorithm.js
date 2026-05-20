const DAY_IN_MS = 24 * 60 * 60 * 1000;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MIN_EASE_FACTOR = 1.3;
const DEFAULT_EASE_FACTOR = 2.5;
const DEFAULT_INTERVAL = 1;
const DUE_CARDS_PER_NEW_CARD = 4;

function assertDateString(dateString) {
  if (!DATE_PATTERN.test(dateString)) {
    throw new Error('Expected date in YYYY-MM-DD format.');
  }

  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const isSameDate =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;

  if (!isSameDate) {
    throw new Error('Expected a valid calendar date.');
  }

  return date;
}

function roundEaseFactor(easeFactor) {
  return Number(Math.max(MIN_EASE_FACTOR, easeFactor).toFixed(2));
}

function getNumericValue(value, fallback) {
  const number = Number(value);

  return Number.isFinite(number) ? number : fallback;
}

function roundInterval(interval) {
  return Math.max(1, Math.round(interval));
}

function interleaveDueCards(reviewCards, learningCards) {
  const queue = [];
  let reviewIndex = 0;
  let learningIndex = 0;

  while (reviewIndex < reviewCards.length || learningIndex < learningCards.length) {
    if (reviewIndex < reviewCards.length) {
      queue.push(reviewCards[reviewIndex]);
      reviewIndex += 1;
    }

    if (learningIndex < learningCards.length) {
      queue.push(learningCards[learningIndex]);
      learningIndex += 1;
    }
  }

  return queue;
}

export function normalizeRating(rating) {
  const normalizedRating = String(rating ?? '').trim().toLowerCase();

  if (!['again', 'hard', 'good', 'easy'].includes(normalizedRating)) {
    throw new Error(`Unsupported SRS rating: ${rating}`);
  }

  return normalizedRating;
}

export function addDays(dateString, days) {
  const date = assertDateString(dateString);
  const wholeDays = Math.trunc(getNumericValue(days, 0));
  const result = new Date(date.getTime() + wholeDays * DAY_IN_MS);

  return result.toISOString().slice(0, 10);
}

export function calculateNextSrsState(currentState, rating, currentDate) {
  const normalizedRating = normalizeRating(rating);
  assertDateString(currentDate);

  if (normalizedRating === 'again') {
    return {
      ...currentState,
      state: 'learning',
      again_count: getNumericValue(currentState?.again_count, 0) + 1,
    };
  }

  const currentInterval = getNumericValue(currentState?.interval, DEFAULT_INTERVAL);
  const currentEaseFactor = getNumericValue(currentState?.ease_factor, DEFAULT_EASE_FACTOR);
  let nextEaseFactor = currentEaseFactor;
  let nextInterval;

  if (normalizedRating === 'hard') {
    nextEaseFactor = roundEaseFactor(currentEaseFactor - 0.15);
    nextInterval = roundInterval(currentInterval * 1.2);
  }

  if (normalizedRating === 'good') {
    nextEaseFactor = roundEaseFactor(currentEaseFactor);
    nextInterval = roundInterval(currentInterval * nextEaseFactor);
  }

  if (normalizedRating === 'easy') {
    nextEaseFactor = roundEaseFactor(currentEaseFactor + 0.15);
    nextInterval = roundInterval(currentInterval * nextEaseFactor * 1.3);
  }

  return {
    ...currentState,
    interval: nextInterval,
    ease_factor: nextEaseFactor,
    due_date: addDays(currentDate, nextInterval),
    repetitions: getNumericValue(currentState?.repetitions, 0) + 1,
    state: 'review',
  };
}

export function buildSessionQueue(reviewCards, learningCards, newCards) {
  const dueCards = interleaveDueCards(reviewCards ?? [], learningCards ?? []);
  const upcomingNewCards = [...(newCards ?? [])];
  const queue = [];
  let dueIndex = 0;
  let newIndex = 0;

  while (dueIndex < dueCards.length || newIndex < upcomingNewCards.length) {
    if (dueIndex >= dueCards.length) {
      queue.push(...upcomingNewCards.slice(newIndex));
      break;
    }

    for (
      let dueCount = 0;
      dueCount < DUE_CARDS_PER_NEW_CARD && dueIndex < dueCards.length;
      dueCount += 1
    ) {
      queue.push(dueCards[dueIndex]);
      dueIndex += 1;
    }

    if (newIndex < upcomingNewCards.length) {
      queue.push(upcomingNewCards[newIndex]);
      newIndex += 1;
    }
  }

  return queue;
}

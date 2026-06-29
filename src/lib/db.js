const DB_FUNCTION_URL = '/.netlify/functions/db';

function getTodayDateString() {
  const now = new Date();
  const localTime = now.getTime() - now.getTimezoneOffset() * 60_000;

  return new Date(localTime).toISOString().slice(0, 10);
}

async function callDb(action, payload = {}) {
  const response = await fetch(DB_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action, payload }),
  });

  let body = {};

  try {
    body = await response.json();
  } catch {
    // Keep the fallback error below when a local dev server does not expose functions.
  }

  if (!response.ok) {
    throw new Error(body.error || 'Database request failed.');
  }

  return body.data;
}

export async function getAllCards() {
  return callDb('getAllCards');
}

export async function getCardById(cardId) {
  return callDb('getCardById', { cardId });
}

export async function upsertVocabCard(card) {
  return callDb('upsertVocabCard', { card });
}

export async function updateCardSentence(cardId, examplePinyin, exampleEnglish) {
  return callDb('updateCardSentence', { cardId, examplePinyin, exampleEnglish });
}

export async function clearAllSentences() {
  return callDb('clearAllSentences');
}

export async function getKnownVocabPinyin() {
  return callDb('getKnownVocabPinyin');
}

export async function getReviewCardsDueToday() {
  return callDb('getReviewCardsDueToday', { today: getTodayDateString() });
}

export async function getLearningCardsDueToday() {
  return callDb('getLearningCardsDueToday', { today: getTodayDateString() });
}

export async function getNewCards(limit) {
  return callDb('getNewCards', { limit });
}

export async function getDashboardCounts() {
  return callDb('getDashboardCounts', { today: getTodayDateString() });
}

export async function updateSrsState(cardId, updates) {
  return callDb('updateSrsState', { cardId, updates });
}

export async function suspendCard(cardId) {
  return callDb('suspendCard', { cardId });
}

export async function unsuspendCard(cardId) {
  return callDb('unsuspendCard', { cardId });
}

export async function getSuspendedCards() {
  return callDb('getSuspendedCards');
}

export async function getAppSettings() {
  return callDb('getAppSettings');
}

export async function updateAppSettings(updates) {
  return callDb('updateAppSettings', { updates });
}

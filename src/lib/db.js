import { supabase } from './supabaseClient';

const SRS_STATE_COLUMNS = `
  card_id,
  interval,
  ease_factor,
  due_date,
  repetitions,
  state,
  again_count,
  suspended,
  last_reviewed
`;

const CARD_COLUMNS = `
  id,
  pinyin,
  english,
  hanzi,
  category,
  notes,
  example_pinyin,
  example_english,
  created_at
`;

const CARD_WITH_SRS_SELECT = `
  ${CARD_COLUMNS},
  srs_state (
    ${SRS_STATE_COLUMNS}
  )
`;

const SRS_WITH_CARD_SELECT = `
  ${SRS_STATE_COLUMNS},
  vocab_cards (
    ${CARD_COLUMNS}
  )
`;

const VOCAB_CARD_FIELDS = ['pinyin', 'english', 'hanzi', 'category', 'notes'];
const SRS_UPDATE_FIELDS = [
  'interval',
  'ease_factor',
  'due_date',
  'repetitions',
  'state',
  'again_count',
  'suspended',
  'last_reviewed',
];
const APP_SETTINGS_ID = 'default';
const APP_SETTINGS_FIELDS = ['new_cards_per_day', 'default_direction', 'deepseek_model'];
const DEFAULT_APP_SETTINGS = {
  id: APP_SETTINGS_ID,
  new_cards_per_day: 20,
  default_direction: 'random',
  deepseek_model: 'deepseek-chat',
};

function handleError(error, context) {
  if (error) {
    throw new Error(`${context}: ${error.message}`, { cause: error });
  }
}

function getTodayDateString() {
  const now = new Date();
  const localTime = now.getTime() - now.getTimezoneOffset() * 60_000;

  return new Date(localTime).toISOString().slice(0, 10);
}

function pickDefined(source = {}, allowedFields) {
  return allowedFields.reduce((payload, field) => {
    if (Object.prototype.hasOwnProperty.call(source, field) && source[field] !== undefined) {
      payload[field] = source[field];
    }

    return payload;
  }, {});
}

function normalizeCardRow(row) {
  if (!row) {
    return null;
  }

  const srsState = Array.isArray(row.srs_state) ? row.srs_state[0] ?? null : row.srs_state ?? null;

  return {
    ...row,
    srs_state: srsState,
  };
}

function normalizeSrsCardRow(row) {
  if (!row?.vocab_cards) {
    return null;
  }

  const { vocab_cards: vocabCard, ...srsState } = row;

  return {
    ...vocabCard,
    srs_state: srsState,
  };
}

function normalizeAppSettings(row) {
  return {
    ...DEFAULT_APP_SETTINGS,
    ...(row ?? {}),
  };
}

async function ensureSrsState(cardId) {
  const { data, error } = await supabase
    .from('srs_state')
    .select('card_id')
    .eq('card_id', cardId)
    .maybeSingle();

  handleError(error, 'Failed to check SRS state');

  if (data) {
    return;
  }

  const { error: insertError } = await supabase.from('srs_state').insert({ card_id: cardId });

  if (insertError?.code === '23505') {
    return;
  }

  handleError(insertError, 'Failed to create SRS state');
}

async function getCardsFromSrsQuery(query, context) {
  const { data, error } = await query;

  handleError(error, context);

  return (data ?? []).map(normalizeSrsCardRow).filter(Boolean);
}

async function getCount(query, context) {
  const { count, error } = await query;

  handleError(error, context);

  return count ?? 0;
}

async function createDefaultAppSettings() {
  const { data, error } = await supabase
    .from('app_settings')
    .insert(DEFAULT_APP_SETTINGS)
    .select('id, new_cards_per_day, default_direction, deepseek_model')
    .single();

  if (error?.code === '23505') {
    return getAppSettings();
  }

  handleError(error, 'Failed to create app settings');

  return normalizeAppSettings(data);
}

export async function getAllCards() {
  const { data, error } = await supabase
    .from('vocab_cards')
    .select(CARD_WITH_SRS_SELECT)
    .order('pinyin', { ascending: true });

  handleError(error, 'Failed to load vocab cards');

  return (data ?? []).map(normalizeCardRow);
}

export async function getCardById(cardId) {
  const { data, error } = await supabase
    .from('vocab_cards')
    .select(CARD_WITH_SRS_SELECT)
    .eq('id', cardId)
    .maybeSingle();

  handleError(error, 'Failed to load vocab card');

  return normalizeCardRow(data);
}

export async function upsertVocabCard(card) {
  const payload = pickDefined(card, VOCAB_CARD_FIELDS);

  if (!payload.pinyin || !payload.english) {
    throw new Error('upsertVocabCard requires pinyin and english.');
  }

  const { data, error } = await supabase
    .from('vocab_cards')
    .upsert(payload, { onConflict: 'pinyin' })
    .select('id')
    .single();

  handleError(error, 'Failed to upsert vocab card');

  await ensureSrsState(data.id);

  return getCardById(data.id);
}

export async function updateCardSentence(cardId, examplePinyin, exampleEnglish) {
  const { data, error } = await supabase
    .from('vocab_cards')
    .update({
      example_pinyin: examplePinyin,
      example_english: exampleEnglish,
    })
    .eq('id', cardId)
    .select(CARD_WITH_SRS_SELECT)
    .single();

  handleError(error, 'Failed to update card sentence');

  return normalizeCardRow(data);
}

export async function clearAllSentences() {
  const { error } = await supabase
    .from('vocab_cards')
    .update({
      example_pinyin: null,
      example_english: null,
    })
    .not('id', 'is', null);

  handleError(error, 'Failed to clear card sentences');
}

export async function getKnownVocabPinyin() {
  const { data, error } = await supabase
    .from('vocab_cards')
    .select('pinyin')
    .order('pinyin', { ascending: true });

  handleError(error, 'Failed to load known vocabulary pinyin');

  return (data ?? []).map((card) => card.pinyin);
}

export async function getReviewCardsDueToday() {
  const today = getTodayDateString();

  return getCardsFromSrsQuery(
    supabase
      .from('srs_state')
      .select(SRS_WITH_CARD_SELECT)
      .eq('state', 'review')
      .lte('due_date', today)
      .eq('suspended', false)
      .order('due_date', { ascending: true })
      .order('card_id', { ascending: true }),
    'Failed to load review cards due today',
  );
}

export async function getLearningCardsDueToday() {
  const today = getTodayDateString();

  return getCardsFromSrsQuery(
    supabase
      .from('srs_state')
      .select(SRS_WITH_CARD_SELECT)
      .eq('state', 'learning')
      .lte('due_date', today)
      .eq('suspended', false)
      .order('due_date', { ascending: true })
      .order('card_id', { ascending: true }),
    'Failed to load learning cards due today',
  );
}

export async function getNewCards(limit) {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error('getNewCards requires a positive integer limit.');
  }

  return getCardsFromSrsQuery(
    supabase
      .from('srs_state')
      .select(SRS_WITH_CARD_SELECT)
      .eq('state', 'new')
      .eq('suspended', false)
      .order('card_id', { ascending: true })
      .limit(limit),
    'Failed to load new cards',
  );
}

export async function getDashboardCounts() {
  const today = getTodayDateString();
  const countOptions = { count: 'exact', head: true };

  const [reviewDueCount, learningDueCount, newCardsCount, suspendedCardsCount] = await Promise.all([
    getCount(
      supabase
        .from('srs_state')
        .select('card_id', countOptions)
        .eq('state', 'review')
        .lte('due_date', today)
        .eq('suspended', false),
      'Failed to count review cards due today',
    ),
    getCount(
      supabase
        .from('srs_state')
        .select('card_id', countOptions)
        .eq('state', 'learning')
        .lte('due_date', today)
        .eq('suspended', false),
      'Failed to count learning cards due today',
    ),
    getCount(
      supabase
        .from('srs_state')
        .select('card_id', countOptions)
        .eq('state', 'new')
        .eq('suspended', false),
      'Failed to count new cards',
    ),
    getCount(
      supabase.from('srs_state').select('card_id', countOptions).eq('suspended', true),
      'Failed to count suspended cards',
    ),
  ]);

  return {
    dueTodayCount: reviewDueCount + learningDueCount,
    newCardsCount,
    suspendedCardsCount,
  };
}

export async function updateSrsState(cardId, updates) {
  const payload = pickDefined(updates, SRS_UPDATE_FIELDS);

  if (Object.keys(payload).length === 0) {
    throw new Error('updateSrsState requires at least one SRS field to update.');
  }

  await ensureSrsState(cardId);

  const { data, error } = await supabase
    .from('srs_state')
    .update(payload)
    .eq('card_id', cardId)
    .select(SRS_STATE_COLUMNS)
    .single();

  handleError(error, 'Failed to update SRS state');

  return data;
}

export async function suspendCard(cardId) {
  return updateSrsState(cardId, { suspended: true });
}

export async function unsuspendCard(cardId) {
  return updateSrsState(cardId, { suspended: false });
}

export async function getSuspendedCards() {
  return getCardsFromSrsQuery(
    supabase
      .from('srs_state')
      .select(SRS_WITH_CARD_SELECT)
      .eq('suspended', true)
      .order('card_id', { ascending: true }),
    'Failed to load suspended cards',
  );
}

export async function getAppSettings() {
  const { data, error } = await supabase
    .from('app_settings')
    .select('id, new_cards_per_day, default_direction, deepseek_model')
    .eq('id', APP_SETTINGS_ID)
    .maybeSingle();

  handleError(error, 'Failed to load app settings');

  if (!data) {
    return createDefaultAppSettings();
  }

  return normalizeAppSettings(data);
}

export async function updateAppSettings(updates) {
  const payload = pickDefined(updates, APP_SETTINGS_FIELDS);

  if (Object.keys(payload).length === 0) {
    throw new Error('updateAppSettings requires at least one settings field to update.');
  }

  const { data, error } = await supabase
    .from('app_settings')
    .upsert(
      {
        ...payload,
        id: APP_SETTINGS_ID,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    )
    .select('id, new_cards_per_day, default_direction, deepseek_model')
    .single();

  handleError(error, 'Failed to update app settings');

  return normalizeAppSettings(data);
}

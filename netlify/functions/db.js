import { neon } from '@neondatabase/serverless';

const APP_SETTINGS_ID = 'default';
const CARD_FIELDS = ['pinyin', 'english', 'hanzi', 'category', 'notes'];
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
const SRS_UPDATE_FIELD_SQL = {
  interval: '"interval"',
  ease_factor: 'ease_factor',
  due_date: 'due_date',
  repetitions: 'repetitions',
  state: 'state',
  again_count: 'again_count',
  suspended: 'suspended',
  last_reviewed: 'last_reviewed',
};
const APP_SETTINGS_FIELDS = ['new_cards_per_day', 'default_direction', 'deepseek_model'];
const DEFAULT_APP_SETTINGS = {
  id: APP_SETTINGS_ID,
  new_cards_per_day: 20,
  default_direction: 'random',
  deepseek_model: 'deepseek-chat',
};
const CARD_WITH_SRS_SELECT = `
  vc.id,
  vc.pinyin,
  vc.english,
  vc.hanzi,
  vc.category,
  vc.notes,
  vc.example_pinyin,
  vc.example_english,
  vc.created_at,
  ss.card_id as srs_card_id,
  ss.interval as srs_interval,
  ss.ease_factor as srs_ease_factor,
  ss.due_date as srs_due_date,
  ss.repetitions as srs_repetitions,
  ss.state as srs_state,
  ss.again_count as srs_again_count,
  ss.suspended as srs_suspended,
  ss.last_reviewed as srs_last_reviewed
`;
const SRS_STATE_SELECT = `
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
const headers = {
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers,
    body: JSON.stringify(body),
  };
}

function getSql() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not configured.');
  }

  return neon(process.env.DATABASE_URL);
}

function getTodayDateString() {
  const now = new Date();
  const localTime = now.getTime() - now.getTimezoneOffset() * 60_000;

  return new Date(localTime).toISOString().slice(0, 10);
}

function toDateString(value) {
  if (!value) {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return String(value).slice(0, 10);
}

function pickDefined(source = {}, allowedFields) {
  return allowedFields.reduce((payload, field) => {
    if (Object.prototype.hasOwnProperty.call(source, field) && source[field] !== undefined) {
      payload[field] = source[field];
    }

    return payload;
  }, {});
}

function normalizeSrsState(row) {
  if (!row) {
    return null;
  }

  return {
    card_id: row.card_id,
    interval: row.interval,
    ease_factor: Number(row.ease_factor),
    due_date: toDateString(row.due_date),
    repetitions: row.repetitions,
    state: row.state,
    again_count: row.again_count,
    suspended: row.suspended,
    last_reviewed: row.last_reviewed,
  };
}

function normalizeCardRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    pinyin: row.pinyin,
    english: row.english,
    hanzi: row.hanzi,
    category: row.category,
    notes: row.notes,
    example_pinyin: row.example_pinyin,
    example_english: row.example_english,
    created_at: row.created_at,
    srs_state: row.srs_card_id
      ? {
          card_id: row.srs_card_id,
          interval: row.srs_interval,
          ease_factor: Number(row.srs_ease_factor),
          due_date: toDateString(row.srs_due_date),
          repetitions: row.srs_repetitions,
          state: row.srs_state,
          again_count: row.srs_again_count,
          suspended: row.srs_suspended,
          last_reviewed: row.srs_last_reviewed,
        }
      : null,
  };
}

function normalizeAppSettings(row) {
  return {
    ...DEFAULT_APP_SETTINGS,
    ...(row ?? {}),
  };
}

async function ensureSrsState(sql, cardId) {
  await sql.query('insert into srs_state (card_id) values ($1) on conflict (card_id) do nothing', [cardId]);
}

async function getCardById(sql, cardId) {
  const rows = await sql.query(
    `
      select ${CARD_WITH_SRS_SELECT}
      from vocab_cards vc
      left join srs_state ss on ss.card_id = vc.id
      where vc.id = $1
      limit 1
    `,
    [cardId],
  );

  return normalizeCardRow(rows[0]);
}

async function getCardsFromSrsRows(sql, whereSql, params = [], orderSql = 'ss.card_id asc') {
  const rows = await sql.query(
    `
      select ${CARD_WITH_SRS_SELECT}
      from srs_state ss
      join vocab_cards vc on vc.id = ss.card_id
      where ${whereSql}
      order by ${orderSql}
    `,
    params,
  );

  return rows.map(normalizeCardRow);
}

async function createDefaultAppSettings(sql) {
  const rows = await sql.query(
    `
      insert into app_settings (id)
      values ($1)
      on conflict (id) do nothing
      returning id, new_cards_per_day, default_direction, deepseek_model
    `,
    [APP_SETTINGS_ID],
  );

  if (rows[0]) {
    return normalizeAppSettings(rows[0]);
  }

  const existingRows = await sql.query(
    'select id, new_cards_per_day, default_direction, deepseek_model from app_settings where id = $1',
    [APP_SETTINGS_ID],
  );

  return normalizeAppSettings(existingRows[0]);
}

const actions = {
  async getAllCards(sql) {
    const rows = await sql.query(`
      select ${CARD_WITH_SRS_SELECT}
      from vocab_cards vc
      left join srs_state ss on ss.card_id = vc.id
      order by vc.pinyin asc
    `);

    return rows.map(normalizeCardRow);
  },

  async getCardById(sql, { cardId }) {
    return getCardById(sql, cardId);
  },

  async upsertVocabCard(sql, { card }) {
    const payload = pickDefined(card, CARD_FIELDS);

    if (!payload.pinyin || !payload.english) {
      throw new Error('upsertVocabCard requires pinyin and english.');
    }

    const rows = await sql.query(
      `
        insert into vocab_cards (pinyin, english, hanzi, category, notes)
        values ($1, $2, $3, $4, $5)
        on conflict (pinyin) do update set
          english = excluded.english,
          hanzi = excluded.hanzi,
          category = excluded.category,
          notes = excluded.notes
        returning id
      `,
      [
        payload.pinyin,
        payload.english,
        payload.hanzi ?? null,
        payload.category ?? null,
        payload.notes ?? null,
      ],
    );

    const cardId = rows[0].id;

    await ensureSrsState(sql, cardId);

    return getCardById(sql, cardId);
  },

  async updateCardSentence(sql, { cardId, examplePinyin, exampleEnglish }) {
    const rows = await sql.query(
      `
        update vocab_cards
        set example_pinyin = $2,
            example_english = $3
        where id = $1
        returning id
      `,
      [cardId, examplePinyin, exampleEnglish],
    );

    if (!rows[0]) {
      throw new Error('Card not found.');
    }

    return getCardById(sql, rows[0].id);
  },

  async clearAllSentences(sql) {
    await sql.query('update vocab_cards set example_pinyin = null, example_english = null');

    return null;
  },

  async getKnownVocabPinyin(sql) {
    const rows = await sql.query('select pinyin from vocab_cards order by pinyin asc');

    return rows.map((card) => card.pinyin);
  },

  async getReviewCardsDueToday(sql, { today = getTodayDateString() }) {

    return getCardsFromSrsRows(
      sql,
      "ss.state = 'review' and ss.due_date <= $1 and ss.suspended = false",
      [today],
      'ss.due_date asc, ss.card_id asc',
    );
  },

  async getLearningCardsDueToday(sql, { today = getTodayDateString() }) {

    return getCardsFromSrsRows(
      sql,
      "ss.state = 'learning' and ss.due_date <= $1 and ss.suspended = false",
      [today],
      'ss.due_date asc, ss.card_id asc',
    );
  },

  async getNewCards(sql, { limit }) {
    if (!Number.isInteger(limit) || limit < 1) {
      throw new Error('getNewCards requires a positive integer limit.');
    }

    const rows = await sql.query(
      `
        select ${CARD_WITH_SRS_SELECT}
        from srs_state ss
        join vocab_cards vc on vc.id = ss.card_id
        where ss.state = 'new'
          and ss.suspended = false
        order by ss.card_id asc
        limit $1
      `,
      [limit],
    );

    return rows.map(normalizeCardRow);
  },

  async getDashboardCounts(sql, { today = getTodayDateString() }) {
    const rows = await sql.query(
      `
        select
          count(*) filter (where state = 'review' and due_date <= $1 and suspended = false) as review_due_count,
          count(*) filter (where state = 'learning' and due_date <= $1 and suspended = false) as learning_due_count,
          count(*) filter (where state = 'new' and suspended = false) as new_cards_count,
          count(*) filter (where suspended = true) as suspended_cards_count
        from srs_state
      `,
      [today],
    );
    const counts = rows[0] ?? {};

    return {
      dueTodayCount: Number(counts.review_due_count ?? 0) + Number(counts.learning_due_count ?? 0),
      newCardsCount: Number(counts.new_cards_count ?? 0),
      suspendedCardsCount: Number(counts.suspended_cards_count ?? 0),
    };
  },

  async updateSrsState(sql, { cardId, updates }) {
    const payload = pickDefined(updates, SRS_UPDATE_FIELDS);
    const fields = Object.keys(payload);

    if (fields.length === 0) {
      throw new Error('updateSrsState requires at least one SRS field to update.');
    }

    await ensureSrsState(sql, cardId);

    const assignments = fields.map((field, index) => `${SRS_UPDATE_FIELD_SQL[field]} = $${index + 2}`);
    const rows = await sql.query(
      `
        update srs_state
        set ${assignments.join(', ')}
        where card_id = $1
        returning ${SRS_STATE_SELECT}
      `,
      [cardId, ...fields.map((field) => payload[field])],
    );

    return normalizeSrsState(rows[0]);
  },

  async suspendCard(sql, { cardId }) {
    return actions.updateSrsState(sql, { cardId, updates: { suspended: true } });
  },

  async unsuspendCard(sql, { cardId }) {
    return actions.updateSrsState(sql, { cardId, updates: { suspended: false } });
  },

  async getSuspendedCards(sql) {
    return getCardsFromSrsRows(sql, 'ss.suspended = true');
  },

  async getAppSettings(sql) {
    const rows = await sql.query(
      'select id, new_cards_per_day, default_direction, deepseek_model from app_settings where id = $1',
      [APP_SETTINGS_ID],
    );

    if (!rows[0]) {
      return createDefaultAppSettings(sql);
    }

    return normalizeAppSettings(rows[0]);
  },

  async updateAppSettings(sql, { updates }) {
    const payload = pickDefined(updates, APP_SETTINGS_FIELDS);
    const fields = Object.keys(payload);

    if (fields.length === 0) {
      throw new Error('updateAppSettings requires at least one settings field to update.');
    }

    await createDefaultAppSettings(sql);

    const assignments = fields.map((field, index) => `${field} = $${index + 2}`);
    const rows = await sql.query(
      `
        update app_settings
        set ${assignments.join(', ')},
            updated_at = now()
        where id = $1
        returning id, new_cards_per_day, default_direction, deepseek_model
      `,
      [APP_SETTINGS_ID, ...fields.map((field) => payload[field])],
    );

    return normalizeAppSettings(rows[0]);
  },
};

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return jsonResponse(204, {});
  }

  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed.' });
  }

  try {
    const { action, payload = {} } = JSON.parse(event.body || '{}');
    const actionHandler = actions[action];

    if (!actionHandler) {
      return jsonResponse(400, { error: `Unsupported database action: ${action}` });
    }

    const data = await actionHandler(getSql(), payload);

    return jsonResponse(200, { data });
  } catch (error) {
    return jsonResponse(500, {
      error: error.message || 'Database request failed.',
    });
  }
}

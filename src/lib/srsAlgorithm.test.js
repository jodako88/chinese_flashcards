import { describe, expect, it } from 'vitest';

import {
  addDays,
  buildSessionQueue,
  calculateNextSrsState,
  normalizeRating,
} from './srsAlgorithm';

const CURRENT_DATE = '2026-05-20';

function makeState(overrides = {}) {
  return {
    interval: 2,
    ease_factor: 2.5,
    due_date: '2026-05-20',
    repetitions: 3,
    state: 'review',
    again_count: 1,
    ...overrides,
  };
}

describe('calculateNextSrsState', () => {
  it('keeps interval and due_date unchanged on Again', () => {
    const state = makeState({ interval: 5, due_date: '2026-05-30' });
    const nextState = calculateNextSrsState(state, 'Again', CURRENT_DATE);

    expect(nextState.interval).toBe(5);
    expect(nextState.due_date).toBe('2026-05-30');
  });

  it('sets state to learning and increments again_count on Again', () => {
    const nextState = calculateNextSrsState(makeState(), 'again', CURRENT_DATE);

    expect(nextState.state).toBe('learning');
    expect(nextState.again_count).toBe(2);
    expect(nextState.repetitions).toBe(3);
  });

  it('does not mutate the current state object', () => {
    const state = makeState();

    calculateNextSrsState(state, 'good', CURRENT_DATE);

    expect(state).toEqual(makeState());
  });

  it('lowers Hard ease factor without going below 1.3', () => {
    const nextState = calculateNextSrsState(makeState({ ease_factor: 1.35 }), 'hard', CURRENT_DATE);

    expect(nextState.ease_factor).toBe(1.3);
  });

  it('keeps Good ease factor unchanged', () => {
    const nextState = calculateNextSrsState(makeState({ ease_factor: 2.35 }), 'good', CURRENT_DATE);

    expect(nextState.ease_factor).toBe(2.35);
  });

  it('raises Easy ease factor', () => {
    const nextState = calculateNextSrsState(makeState({ ease_factor: 2.5 }), 'easy', CURRENT_DATE);

    expect(nextState.ease_factor).toBe(2.65);
  });

  it.each(['hard', 'good', 'easy'])(
    'sets state to review and increments repetitions on %s',
    (rating) => {
      const nextState = calculateNextSrsState(makeState({ state: 'new' }), rating, CURRENT_DATE);

      expect(nextState.state).toBe('review');
      expect(nextState.repetitions).toBe(4);
    },
  );

  it.each(['hard', 'good', 'easy'])('keeps %s intervals at least 1 day', (rating) => {
    const nextState = calculateNextSrsState(makeState({ interval: 0 }), rating, CURRENT_DATE);

    expect(nextState.interval).toBe(1);
    expect(nextState.due_date).toBe('2026-05-21');
  });

  it('calculates Good due_date deterministically from currentDate', () => {
    const nextState = calculateNextSrsState(
      makeState({ interval: 2, ease_factor: 2.5 }),
      'good',
      CURRENT_DATE,
    );

    expect(nextState.interval).toBe(5);
    expect(nextState.due_date).toBe('2026-05-25');
  });

  it('calculates Easy due_date from the rounded next interval', () => {
    const nextState = calculateNextSrsState(
      makeState({ interval: 2, ease_factor: 2.5 }),
      'easy',
      CURRENT_DATE,
    );

    expect(nextState.interval).toBe(7);
    expect(nextState.due_date).toBe('2026-05-27');
  });
});

describe('addDays', () => {
  it('adds whole days to YYYY-MM-DD date strings', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
  });
});

describe('normalizeRating', () => {
  it('normalizes rating labels', () => {
    expect(normalizeRating(' Easy ')).toBe('easy');
  });

  it('rejects unsupported ratings', () => {
    expect(() => normalizeRating('later')).toThrow('Unsupported SRS rating');
  });
});

describe('buildSessionQueue', () => {
  it('interleaves one new card after roughly four due cards', () => {
    const reviewCards = ['r1', 'r2', 'r3', 'r4', 'r5'];
    const learningCards = ['l1', 'l2', 'l3'];
    const newCards = ['n1', 'n2'];

    expect(buildSessionQueue(reviewCards, learningCards, newCards)).toEqual([
      'r1',
      'l1',
      'r2',
      'l2',
      'n1',
      'r3',
      'l3',
      'r4',
      'r5',
      'n2',
    ]);
  });

  it('continues with new cards when due cards run out', () => {
    expect(buildSessionQueue(['r1'], [], ['n1', 'n2'])).toEqual(['r1', 'n1', 'n2']);
  });

  it('fills remaining slots with due cards when new cards run out', () => {
    expect(buildSessionQueue(['r1', 'r2', 'r3', 'r4', 'r5'], [], ['n1'])).toEqual([
      'r1',
      'r2',
      'r3',
      'r4',
      'n1',
      'r5',
    ]);
  });
});

import { FlashCard } from '../components/FlashCard';
import { ProgressBar } from '../components/ProgressBar';
import { RatingButtons } from '../components/RatingButtons';
import { SessionSummary } from '../components/SessionSummary';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useSentence } from '../hooks/useSentence';
import { useSession } from '../hooks/useSession';
import { useSettings } from '../hooks/useSettings';

const DIRECTIONS = [
  { id: 'py-en', label: 'PY to EN' },
  { id: 'en-py', label: 'EN to PY' },
  { id: 'random', label: 'Random' },
];

export function Study({ onDone }) {
  const isOnline = useOnlineStatus();
  const settingsState = useSettings();
  const session = useSession({
    defaultDirection: settingsState.settings.default_direction,
    isEnabled: !settingsState.isLoading,
    isOnline,
    newCardLimit: settingsState.settings.new_cards_per_day,
  });
  const sentence = useSentence({
    card: session.currentCard,
    isEnabled: session.isAnswerRevealed,
    isOnline,
    model: settingsState.settings.deepseek_model,
  });

  if (settingsState.isLoading || session.isLoading) {
    return (
      <main className="min-h-screen bg-stone-50 px-6 py-12 text-stone-950">
        <div className="mx-auto max-w-xl rounded-3xl border border-stone-200 bg-white px-6 py-10 text-center shadow-sm">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-stone-200 border-t-indigo-500" />
          <p className="text-sm text-stone-600">Loading study session...</p>
        </div>
      </main>
    );
  }

  if (session.isComplete) {
    return <SessionSummary onDone={onDone} stats={session.stats} />;
  }

  return (
    <main className="min-h-screen bg-stone-50 px-6 py-6 text-stone-950">
      <section className="mx-auto max-w-xl">
        <div className="mb-5 flex items-center justify-between gap-4">
          <button
            className="rounded-xl px-3 py-2 text-sm font-medium text-stone-600 transition hover:bg-stone-100"
            onClick={onDone}
            type="button"
          >
            Back
          </button>
          <div className="flex rounded-xl border border-stone-200 bg-stone-100 p-1">
            {DIRECTIONS.map((direction) => (
              <button
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  session.direction === direction.id
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-stone-500 hover:text-stone-950'
                }`}
                key={direction.id}
                onClick={() => session.chooseDirection(direction.id)}
                type="button"
              >
                {direction.label}
              </button>
            ))}
          </div>
        </div>

        <ProgressBar current={session.progress.current} total={session.progress.total} />

        {session.error && (
          <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {session.error}
          </p>
        )}
        {settingsState.error && (
          <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {settingsState.error} Using default study settings for this session.
          </p>
        )}
        {!isOnline && (
          <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            You're offline. Cached cards are reviewable, but example sentence generation is unavailable.
            Reviews made offline are kept in this session only.
          </p>
        )}

        {session.currentCard && (
          <div className="mt-5 space-y-5">
            <FlashCard
              card={session.currentCard}
              direction={session.activeDirection}
              isRevealed={session.isAnswerRevealed}
              onReveal={session.revealAnswer}
              sentence={sentence}
            />

            {session.isAnswerRevealed && (
              <RatingButtons
                disabled={session.isSubmitting}
                markKnownDisabled={!session.canMarkKnown}
                onMarkKnown={session.markCurrentCardAsKnown}
                onRate={session.rateCurrentCard}
              />
            )}
          </div>
        )}
      </section>
    </main>
  );
}

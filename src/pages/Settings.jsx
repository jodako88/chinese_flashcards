import { useState } from 'react';

import { CsvUpload } from '../components/CsvUpload';
import { useSettings } from '../hooks/useSettings';
import { useVocab } from '../hooks/useVocab';

const DIRECTIONS = [
  { value: 'en-py', label: 'EN to PY' },
  { value: 'py-en', label: 'PY to EN' },
  { value: 'random', label: 'Random' },
];
const MODELS = ['deepseek-chat', 'deepseek-reasoner'];

export function Settings({ onBack }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const { importCsvFile, importResult, isImporting } = useVocab();
  const settingsState = useSettings({ includeSuspendedCards: true });
  const { settings } = settingsState;

  function updateNewCardsPerDay(value) {
    const nextValue = Math.min(100, Math.max(1, Number(value) || 1));

    void settingsState.saveSetting('new_cards_per_day', nextValue);
  }

  async function confirmClearSentences() {
    setShowConfirm(false);
    await settingsState.clearSentenceCache();
  }

  return (
    <main className="min-h-screen bg-stone-50 px-6 py-10 text-stone-950">
      <section className="mx-auto max-w-xl">
        <div className="mb-8 flex items-center gap-3">
          <button
            className="rounded-xl px-3 py-2 text-sm font-medium text-stone-600 transition hover:bg-stone-100"
            onClick={onBack}
            type="button"
          >
            Back
          </button>
          <h1 className="text-3xl font-semibold tracking-normal">Settings</h1>
        </div>

        {settingsState.error && (
          <p className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {settingsState.error}
          </p>
        )}
        {settingsState.message && (
          <p className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {settingsState.message}
          </p>
        )}

        <SectionLabel>Study</SectionLabel>
        <SettingsCard>
          <SettingsRow label="New cards per day" sublabel="Applies from the next session.">
            <div className="flex items-center gap-2">
              <button
                className="h-9 w-9 rounded-xl border border-stone-200 bg-stone-50 text-lg text-stone-600 disabled:opacity-50"
                disabled={settingsState.isSaving}
                onClick={() => updateNewCardsPerDay(settings.new_cards_per_day - 1)}
                type="button"
              >
                -
              </button>
              <span className="flex h-9 w-14 items-center justify-center rounded-xl border border-stone-200 bg-white text-sm font-medium">
                {settings.new_cards_per_day}
              </span>
              <button
                className="h-9 w-9 rounded-xl border border-stone-200 bg-stone-50 text-lg text-stone-600 disabled:opacity-50"
                disabled={settingsState.isSaving}
                onClick={() => updateNewCardsPerDay(settings.new_cards_per_day + 1)}
                type="button"
              >
                +
              </button>
            </div>
          </SettingsRow>

          <SettingsRow label="Default direction">
            <select
              className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm"
              disabled={settingsState.isSaving}
              onChange={(event) => settingsState.saveSetting('default_direction', event.target.value)}
              value={settings.default_direction}
            >
              {DIRECTIONS.map((direction) => (
                <option key={direction.value} value={direction.value}>
                  {direction.label}
                </option>
              ))}
            </select>
          </SettingsRow>
        </SettingsCard>

        <SectionLabel>Vocabulary</SectionLabel>
        <CsvUpload
          importResult={importResult}
          isImporting={isImporting}
          onImport={importCsvFile}
        />

        <SectionLabel>AI</SectionLabel>
        <SettingsCard>
          <SettingsRow label="Deepseek model">
            <select
              className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm"
              disabled={settingsState.isSaving}
              onChange={(event) => settingsState.saveSetting('deepseek_model', event.target.value)}
              value={settings.deepseek_model}
            >
              {MODELS.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          </SettingsRow>

          <SettingsRow label="Regenerate All Sentences" sublabel="Clears cached examples; new ones regenerate during study.">
            <button
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={settingsState.isClearingSentences}
              onClick={() => setShowConfirm(true)}
              type="button"
            >
              {settingsState.isClearingSentences ? 'Clearing...' : 'Clear cache'}
            </button>
          </SettingsRow>
        </SettingsCard>

        <SectionLabel>Suspended Words</SectionLabel>
        <SettingsCard>
          {settingsState.isLoadingSuspendedCards ? (
            <p className="px-4 py-6 text-center text-sm text-stone-500">Loading suspended words...</p>
          ) : settingsState.suspendedCards.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-stone-500">No suspended words.</p>
          ) : (
            settingsState.suspendedCards.map((card, index) => (
              <div
                className={`flex items-center justify-between gap-4 px-4 py-3 ${
                  index < settingsState.suspendedCards.length - 1 ? 'border-b border-stone-200' : ''
                }`}
                key={card.id}
              >
                <div>
                  <p className="text-base text-stone-950">{card.pinyin}</p>
                  <p className="text-sm text-stone-500">{card.english}</p>
                </div>
                <button
                  className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700"
                  onClick={() => settingsState.unsuspend(card.id)}
                  type="button"
                >
                  Unsuspend
                </button>
              </div>
            ))
          )}
        </SettingsCard>
      </section>

      {showConfirm && (
        <div className="fixed inset-0 flex items-center justify-center bg-stone-950/40 px-6">
          <div className="max-w-sm rounded-3xl border border-stone-200 bg-white px-6 py-6 shadow-xl">
            <h2 className="text-xl font-semibold">Clear cached sentences?</h2>
            <p className="mt-3 text-sm leading-6 text-stone-600">
              This will not call Deepseek right now. Sentences will regenerate one at a time as you study.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-medium text-stone-600"
                onClick={() => setShowConfirm(false)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="rounded-xl bg-red-600 px-4 py-3 text-sm font-medium text-white"
                onClick={confirmClearSentences}
                type="button"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function SectionLabel({ children }) {
  return <p className="mb-2 mt-8 text-xs font-medium uppercase text-stone-400">{children}</p>;
}

function SettingsCard({ children }) {
  return <div className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">{children}</div>;
}

function SettingsRow({ children, label, sublabel }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-stone-200 px-4 py-4 last:border-b-0">
      <div>
        <p className="text-base text-stone-950">{label}</p>
        {sublabel && <p className="mt-1 text-sm text-stone-500">{sublabel}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

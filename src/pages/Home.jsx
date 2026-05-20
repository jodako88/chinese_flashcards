import { useDashboard } from '../hooks/useDashboard';

export function Home({ onSettings, onStudy }) {
  const { counts, error, isLoading } = useDashboard();
  const hasStudyCards = counts.dueTodayCount > 0 || counts.newCardsCount > 0;

  return (
    <main className="min-h-screen bg-stone-50 text-stone-950">
      <section className="mx-auto flex min-h-screen max-w-xl flex-col px-6 py-12">
        <div className="mb-7 flex items-start justify-between gap-4">
          <div>
            <p className="mb-1 text-sm text-stone-600">Good morning</p>
            <h1 className="text-3xl font-semibold tracking-normal">Ready to study?</h1>
          </div>
          <button
            className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-500 shadow-sm"
            onClick={onSettings}
            title="Open settings"
            type="button"
          >
            Settings
          </button>
        </div>

        {error && (
          <p className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="mb-7 grid grid-cols-3 gap-3">
          <DashboardCard label="due today" loading={isLoading} tone="indigo" value={counts.dueTodayCount} />
          <DashboardCard label="new cards" loading={isLoading} tone="emerald" value={counts.newCardsCount} />
          <DashboardCard label="suspended" loading={isLoading} tone="stone" value={counts.suspendedCardsCount} />
        </div>

        <button
          className="mb-8 w-full rounded-2xl bg-indigo-600 px-5 py-4 text-base font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-400"
          disabled={!hasStudyCards || isLoading}
          onClick={onStudy}
          type="button"
        >
          {hasStudyCards ? `Study Now - ${counts.dueTodayCount + counts.newCardsCount} cards` : 'Nothing due - check back later'}
        </button>
      </section>
    </main>
  );
}

function DashboardCard({ label, loading, tone, value }) {
  const tones = {
    emerald: 'bg-emerald-50 text-emerald-700',
    indigo: 'bg-indigo-50 text-indigo-700',
    stone: 'bg-stone-100 text-stone-600',
  };

  return (
    <div className={`rounded-2xl border border-stone-200 px-4 py-4 ${tones[tone]}`}>
      <p className="text-3xl font-semibold leading-none">{loading ? '-' : value}</p>
      <p className="mt-2 text-xs font-medium uppercase text-stone-500">{label}</p>
    </div>
  );
}

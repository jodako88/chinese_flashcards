const RATING_META = [
  { key: 'again', label: 'Again', colorClass: 'text-red-700', barClass: 'bg-red-500', bgClass: 'bg-red-50' },
  {
    key: 'hard',
    label: 'Hard',
    colorClass: 'text-amber-700',
    barClass: 'bg-amber-500',
    bgClass: 'bg-amber-50',
  },
  {
    key: 'good',
    label: 'Good',
    colorClass: 'text-emerald-700',
    barClass: 'bg-emerald-500',
    bgClass: 'bg-emerald-50',
  },
  { key: 'easy', label: 'Easy', colorClass: 'text-sky-700', barClass: 'bg-sky-500', bgClass: 'bg-sky-50' },
];

function getPercent(count, total) {
  return total > 0 ? Math.round((count / total) * 100) : 0;
}

export function SessionSummary({ onDone, stats }) {
  const totalReviewed = stats.totalReviewed;
  const successfulCount = stats.good + stats.easy;
  const successRate = getPercent(successfulCount, totalReviewed);

  return (
    <main className="min-h-screen bg-stone-50 px-6 py-12 text-stone-950">
      <section className="mx-auto max-w-xl">
        <div className="mb-8 text-center">
          <p className="mb-3 text-sm font-medium uppercase text-emerald-700">Session complete</p>
          <h1 className="text-3xl font-semibold tracking-normal">Nice work.</h1>
          <p className="mt-3 text-sm text-stone-600">
            You reviewed <strong className="font-semibold text-stone-950">{totalReviewed}</strong> cards.
          </p>
        </div>

        <div
          className={`mb-4 rounded-3xl border px-6 py-7 text-center ${
            successRate >= 70
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          <p className="text-sm font-medium">Good + Easy rate</p>
          <p className="mt-1 text-6xl font-semibold leading-none">{successRate}%</p>
        </div>

        <div className="mb-4 rounded-3xl border border-stone-200 bg-white px-5 py-5 shadow-sm">
          <p className="mb-4 text-xs font-medium uppercase text-stone-400">Breakdown</p>
          <div className="space-y-4">
            {RATING_META.map((rating) => {
              const count = stats[rating.key];
              const percent = getPercent(count, totalReviewed);

              return (
                <div className="flex items-center gap-3" key={rating.key}>
                  <span
                    className={`min-w-14 rounded-lg px-2 py-1 text-center text-xs font-medium ${rating.bgClass} ${rating.colorClass}`}
                  >
                    {rating.label}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-stone-200">
                    <div className={`h-full rounded-full ${rating.barClass}`} style={{ width: `${percent}%` }} />
                  </div>
                  <span className="min-w-16 text-right text-sm text-stone-600">
                    {count} <span className="text-stone-400">({percent}%)</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mb-8 grid grid-cols-2 gap-3">
          <SummaryTile label="New graduated" value={stats.newCardsGraduated} />
          <SummaryTile label="Marked known" value={stats.markedKnown} />
        </div>

        <button
          className="w-full rounded-2xl bg-indigo-600 px-5 py-4 text-base font-medium text-white transition hover:bg-indigo-700"
          onClick={onDone}
          type="button"
        >
          Done
        </button>
      </section>
    </main>
  );
}

function SummaryTile({ label, value }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white px-4 py-4 shadow-sm">
      <p className="text-3xl font-semibold text-stone-950">{value}</p>
      <p className="mt-1 text-xs font-medium uppercase text-stone-500">{label}</p>
    </div>
  );
}

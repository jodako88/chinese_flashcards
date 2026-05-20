const RATINGS = [
  { id: 'again', label: 'Again', className: 'border-red-200 text-red-700 hover:bg-red-50' },
  { id: 'hard', label: 'Hard', className: 'border-amber-200 text-amber-700 hover:bg-amber-50' },
  { id: 'good', label: 'Good', className: 'border-emerald-200 text-emerald-700 hover:bg-emerald-50' },
  { id: 'easy', label: 'Easy', className: 'border-sky-200 text-sky-700 hover:bg-sky-50' },
];

export function RatingButtons({ disabled, markKnownDisabled = disabled, onMarkKnown, onRate }) {
  return (
    <div>
      <div className="grid grid-cols-4 gap-2">
        {RATINGS.map((rating) => (
          <button
            className={`rounded-xl border bg-white px-2 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${rating.className}`}
            disabled={disabled}
            key={rating.id}
            onClick={() => onRate(rating.id)}
            type="button"
          >
            {rating.label}
          </button>
        ))}
      </div>

      <button
        className="mt-4 w-full rounded-xl px-4 py-2 text-sm font-medium text-stone-500 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={markKnownDisabled}
        onClick={onMarkKnown}
        type="button"
      >
        Mark as Known
      </button>
    </div>
  );
}

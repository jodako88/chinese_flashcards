export function ProgressBar({ current, total }) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm text-stone-600">
        <span>
          {current} of {total} cards
        </span>
        <span>{percentage}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-stone-200">
        <div
          className="h-full rounded-full bg-indigo-500 transition-[width]"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

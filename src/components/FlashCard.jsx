function getFrontText(card, direction) {
  return direction === 'en-py' ? card.english : card.pinyin;
}

function getFrontLabel(direction) {
  return direction === 'en-py' ? 'English' : 'Pinyin';
}

export function FlashCard({ card, direction, isRevealed, onReveal, sentence }) {
  return (
    <article className="rounded-3xl border border-stone-200 bg-white px-6 py-8 shadow-sm">
      <div className="flex min-h-[220px] flex-col items-center justify-center text-center">
        <span className="mb-6 rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium uppercase text-indigo-600">
          {getFrontLabel(direction)}
        </span>
        <p className="text-4xl font-medium leading-tight text-stone-950">{getFrontText(card, direction)}</p>
      </div>

      {isRevealed ? (
        <div className="border-t border-stone-200 pt-6">
          <dl className="space-y-4">
            <div>
              <dt className="text-xs font-medium uppercase text-stone-400">Pinyin</dt>
              <dd className="mt-1 text-xl text-stone-950">{card.pinyin}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-stone-400">English</dt>
              <dd className="mt-1 text-xl text-stone-950">{card.english}</dd>
            </div>
            {card.notes && (
              <div>
                <dt className="text-xs font-medium uppercase text-stone-400">Notes</dt>
                <dd className="mt-1 text-sm leading-6 text-stone-600">{card.notes}</dd>
              </div>
            )}
          </dl>

          <div className="mt-6 rounded-2xl bg-stone-50 px-4 py-4">
            <SentenceBlock sentence={sentence} />
          </div>

          <button
            className="mt-3 text-sm font-medium text-stone-500 transition hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!sentence.canGenerate}
            onClick={sentence.regenerateSentence}
            type="button"
          >
            ↻ Regenerate
          </button>
        </div>
      ) : (
        <button
          className="mt-6 w-full rounded-2xl bg-indigo-600 px-4 py-4 text-base font-medium text-white transition hover:bg-indigo-700"
          onClick={onReveal}
          type="button"
        >
          Show Answer
        </button>
      )}
    </article>
  );
}

function SentenceBlock({ sentence }) {
  if (sentence.isGenerating) {
    return (
      <div className="flex items-center gap-3 text-sm text-stone-600">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-stone-200 border-t-indigo-500" />
        Generating example...
      </div>
    );
  }

  if (sentence.error) {
    return (
      <div>
        {sentence.isUnavailable && (
          <p className="mb-2 text-xs font-medium uppercase text-amber-700">
            Sentence generation unavailable
          </p>
        )}
        <p className="text-sm leading-6 text-amber-700">{sentence.error}</p>
      </div>
    );
  }

  if (!sentence.hasSentence) {
    return <p className="text-sm text-stone-500">Example sentence not generated yet.</p>;
  }

  return (
    <>
      <p className="text-sm leading-6 text-stone-950">
        {sentence.examplePinyinParts.map((part, index) =>
          part.isTarget ? (
            <strong className="font-semibold text-indigo-700" key={`${part.text}-${index}`}>
              {part.text}
            </strong>
          ) : (
            <span key={`${part.text}-${index}`}>{part.text}</span>
          ),
        )}
      </p>
      {sentence.exampleEnglish && (
        <p className="mt-1 text-sm leading-6 text-stone-600">{sentence.exampleEnglish}</p>
      )}
    </>
  );
}

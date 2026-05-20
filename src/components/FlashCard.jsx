function getFrontText(card, direction) {
  return direction === 'en-py' ? card.english : card.pinyin;
}

function getFrontLabel(direction) {
  return direction === 'en-py' ? 'English' : 'Pinyin';
}

function shouldShowFrontHanzi(card, direction) {
  return direction !== 'en-py' && Boolean(card.hanzi);
}

function getAnswerFields(card, direction) {
  const fields =
    direction === 'en-py'
      ? [
          {
            label: 'Pinyin',
            value: card.pinyin,
            detail: card.hanzi,
            className: 'text-xl text-stone-950',
            detailClassName: 'mt-2 text-2xl text-stone-950',
          },
          { label: 'English', value: card.english, className: 'text-xl text-stone-950' },
        ]
      : [
          { label: 'English', value: card.english, className: 'text-xl text-stone-950' },
        ];

  if (card.notes) {
    fields.push({ label: 'Notes', value: card.notes, className: 'text-sm leading-6 text-stone-600' });
  }

  return fields.filter((field) => field.value);
}

export function FlashCard({ card, direction, isRevealed, onReveal, sentence }) {
  return (
    <article className="rounded-3xl border border-stone-200 bg-white px-6 py-8 shadow-sm">
      <div className="flex min-h-[220px] flex-col items-center justify-center text-center">
        <span className="mb-6 rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium uppercase text-indigo-600">
          {getFrontLabel(direction)}
        </span>
        <p className="text-4xl font-medium leading-tight text-stone-950">{getFrontText(card, direction)}</p>
        {shouldShowFrontHanzi(card, direction) && (
          <p className="mt-3 text-3xl font-medium leading-tight text-stone-700">{card.hanzi}</p>
        )}
      </div>

      {isRevealed ? (
        <div className="border-t border-stone-200 pt-6">
          <dl className="space-y-4">
            {getAnswerFields(card, direction).map((field) => (
              <div key={field.label}>
                <dt className="text-xs font-medium uppercase text-stone-400">{field.label}</dt>
                <dd className={`mt-1 ${field.className}`}>{field.value}</dd>
                {field.detail && <dd className={field.detailClassName}>{field.detail}</dd>}
              </div>
            ))}
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

import { useState, useEffect } from "react";

const COLORS = {
  bg: "#F7F6F2", surface: "#FFFFFF", border: "#E8E6DF",
  text: "#1C1B18", muted: "#6B6860", hint: "#9E9C96",
  accent: "#4A47A3", accentLight: "#EEEDFE", accentMid: "#7F77DD",
  again: "#E24B4A", againLight: "#FCEBEB",
  hard: "#BA7517", hardLight: "#FAEEDA",
  good: "#3B6D11", goodLight: "#EAF3DE",
  easy: "#185FA5", easyLight: "#E6F1FB",
  amber: "#BA7517", amberLight: "#FAEEDA",
  gray: "#5F5E5A", grayLight: "#F1EFE8",
};

const DIRECTIONS = ["PY → EN", "EN → PY", "Random"];
const MODELS = ["deepseek-chat", "deepseek-reasoner"];

const MOCK_CARDS = [
  { pinyin: "xǐhuān", english: "to like", notes: "common verb, often followed by a noun or verb phrase", example_pinyin: "wǒ xǐhuān chī píngguǒ", example_english: "I like to eat apples" },
  { pinyin: "nǐ hǎo", english: "hello", notes: "standard greeting, lit. 'you good'", example_pinyin: "nǐ hǎo, wǒ shì lǎoshī", example_english: "Hello, I am a teacher" },
  { pinyin: "chī", english: "to eat", notes: "very common verb", example_pinyin: "wǒ xǐhuān chī píngguǒ", example_english: "I like to eat apples" },
  { pinyin: "míngtiān", english: "tomorrow", notes: "time word, placed before the verb", example_pinyin: "wǒ míngtiān qù xuéxiào", example_english: "I am going to school tomorrow" },
  { pinyin: "péngyǒu", english: "friend", notes: "lit. 'companion friend'", example_pinyin: "tā shì wǒ de péngyǒu", example_english: "She is my friend" },
];

const MOCK_SUSPENDED = [
  { id: 1, pinyin: "fēijī", english: "airplane" },
  { id: 2, pinyin: "yīyuàn", english: "hospital" },
  { id: 3, pinyin: "túshūguǎn", english: "library" },
];

// ── Shared primitives ──────────────────────────────────────────────

function SectionLabel({ children }) {
  return <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 500, color: COLORS.hint, textTransform: "uppercase", letterSpacing: "0.08em" }}>{children}</p>;
}

function Card({ children, style = {} }) {
  return <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 14, overflow: "hidden", ...style }}>{children}</div>;
}

function Row({ label, sublabel, children, last }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: last ? "none" : `1px solid ${COLORS.border}`, gap: 16 }}>
      <div>
        <p style={{ margin: 0, fontSize: 15, color: COLORS.text }}>{label}</p>
        {sublabel && <p style={{ margin: "2px 0 0", fontSize: 12, color: COLORS.hint }}>{sublabel}</p>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

// ── Home ──────────────────────────────────────────────────────────

function Home({ onStudy, onSettings }) {
  const [uploading, setUploading] = useState(false);
  const due = 12, newCards = 8, suspended = 3, streak = 7, total = 74;
  const hasCards = due > 0 || newCards > 0;

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "48px 20px 40px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <p style={{ margin: "0 0 4px", fontSize: 14, color: COLORS.muted }}>Good morning</p>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 500, letterSpacing: "-0.01em" }}>Ready to study?</h1>
        </div>
        <button onClick={onSettings} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 38, height: 38, borderRadius: 10, background: COLORS.surface, border: `1px solid ${COLORS.border}`, color: COLORS.muted, cursor: "pointer", fontSize: 18 }}>⚙</button>
      </div>

      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: COLORS.amberLight, border: `1px solid #EFD9A0`, borderRadius: 99, padding: "5px 14px", fontSize: 13, fontWeight: 500, color: COLORS.amber }}>
          🔥 {streak}-day streak
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 28 }}>
        {[
          { label: "due for review", value: due, color: due > 0 ? COLORS.accent : COLORS.muted, bg: due > 0 ? COLORS.accentLight : COLORS.grayLight, icon: "📋" },
          { label: "new today", value: newCards, color: newCards > 0 ? COLORS.good : COLORS.muted, bg: newCards > 0 ? COLORS.goodLight : COLORS.grayLight, icon: "✨" },
          { label: "suspended", value: suspended, color: COLORS.gray, bg: COLORS.grayLight, icon: "⏸" },
          { label: "total cards", value: total, color: COLORS.muted, bg: COLORS.grayLight, icon: "🗂" },
        ].map(({ label, value, color, bg, icon }) => (
          <div key={label} style={{ background: bg, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: "18px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 20 }}>{icon}</span>
            <span style={{ fontSize: 28, fontWeight: 500, color, lineHeight: 1 }}>{value}</span>
            <span style={{ fontSize: 13, color: COLORS.muted }}>{label}</span>
          </div>
        ))}
      </div>

      <button onClick={hasCards ? onStudy : undefined} disabled={!hasCards} style={{ width: "100%", padding: "16px", background: hasCards ? COLORS.accent : COLORS.border, color: hasCards ? "#fff" : COLORS.hint, border: "none", borderRadius: 14, fontSize: 17, fontWeight: 500, fontFamily: "inherit", cursor: hasCards ? "pointer" : "not-allowed", marginBottom: 12 }}>
        {hasCards ? `Study Now  →  ${due + newCards} cards` : "Nothing due — check back later"}
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "24px 0" }}>
        <div style={{ flex: 1, height: 1, background: COLORS.border }} />
        <span style={{ fontSize: 12, color: COLORS.hint }}>vocab</span>
        <div style={{ flex: 1, height: 1, background: COLORS.border }} />
      </div>

      <div style={{ background: COLORS.surface, border: `1px dashed ${COLORS.border}`, borderRadius: 14, padding: "24px 20px", textAlign: "center" }}>
        {uploading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, color: COLORS.muted }}>
            <div style={{ width: 22, height: 22, border: `2px solid ${COLORS.border}`, borderTopColor: COLORS.accentMid, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            <span style={{ fontSize: 14 }}>Importing words…</span>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 28, marginBottom: 8 }}>📥</div>
            <p style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 500 }}>Update vocabulary</p>
            <p style={{ margin: "0 0 16px", fontSize: 13, color: COLORS.muted }}>Upload a CSV to add or refresh words. Existing SRS progress is preserved.</p>
            <button onClick={() => { setUploading(true); setTimeout(() => setUploading(false), 1500); }} style={{ padding: "9px 22px", background: COLORS.accentLight, color: COLORS.accent, border: `1px solid #CCC9F6`, borderRadius: 10, fontSize: 14, fontWeight: 500, fontFamily: "inherit", cursor: "pointer" }}>
              Choose CSV file
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Study ─────────────────────────────────────────────────────────

function Study({ onDone }) {
  const [revealed, setRevealed] = useState(false);
  const [direction, setDirection] = useState("PY → EN");
  const [generating, setGenerating] = useState(false);
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [ratings, setRatings] = useState({ again: 0, hard: 0, good: 0, easy: 0 });
  const [graduated, setGraduated] = useState(0);
  const [markedKnown, setMarkedKnown] = useState(0);
  const total = MOCK_CARDS.length;
  const card = MOCK_CARDS[current];
  const showPinyin = direction !== "EN → PY";

  function advance(rating, isKnown = false) {
    if (animating) return;
    if (rating) setRatings(r => ({ ...r, [rating]: r[rating] + 1 }));
    if (isKnown) setMarkedKnown(k => k + 1);
    if (rating === "good" || rating === "easy") setGraduated(g => g + 1);
    if (current + 1 >= total) { onDone({ ratings: { ...ratings, [rating]: (ratings[rating] || 0) + 1 }, graduated: graduated + (rating === "good" || rating === "easy" ? 1 : 0), markedKnown: markedKnown + (isKnown ? 1 : 0), total }); return; }
    setAnimating(true);
    setTimeout(() => { setRevealed(false); setCurrent(c => c + 1); setAnimating(false); }, 280);
  }

  const pct = total > 0 ? Math.round(((current + 1) / total) * 100) : 0;

  function boldTarget(sentence, target) {
    if (!target || !sentence) return sentence;
    const idx = sentence.indexOf(target);
    if (idx === -1) return sentence;
    return <>{sentence.slice(0, idx)}<strong style={{ color: COLORS.accent }}>{target}</strong>{sentence.slice(idx + target.length)}</>;
  }

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "16px 20px 32px" }}>
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <button onClick={() => onDone(null)} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.muted, fontSize: 22, padding: 4, lineHeight: 1 }}>←</button>
        <div style={{ display: "flex", gap: 4, background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: 3 }}>
          {DIRECTIONS.map(d => (
            <button key={d} onClick={() => setDirection(d)} style={{ padding: "4px 10px", fontSize: 12, fontFamily: "inherit", borderRadius: 6, border: "none", cursor: "pointer", fontWeight: direction === d ? 500 : 400, background: direction === d ? COLORS.surface : "transparent", color: direction === d ? COLORS.accent : COLORS.muted, boxShadow: direction === d ? `0 0 0 0.5px ${COLORS.border}` : "none" }}>
              {d}
            </button>
          ))}
        </div>
        <div style={{ width: 30 }} />
      </div>

      {/* Progress */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 13, color: COLORS.muted }}>{current + 1} of {total} cards</span>
          <span style={{ fontSize: 13, color: COLORS.muted }}>{pct}%</span>
        </div>
        <div style={{ height: 4, background: COLORS.border, borderRadius: 99, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: COLORS.accentMid, borderRadius: 99, transition: "width 0.3s ease" }} />
        </div>
      </div>

      {/* Card */}
      <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 18, padding: "40px 28px 32px", marginBottom: 20, minHeight: revealed ? 320 : 220, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", transition: "min-height 0.2s ease, opacity 0.28s ease", opacity: animating ? 0 : 1 }}>
        <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", color: COLORS.accentMid, background: COLORS.accentLight, padding: "3px 10px", borderRadius: 99, marginBottom: 28, textTransform: "uppercase" }}>
          {showPinyin ? "Pinyin" : "English"}
        </span>
        <p style={{ fontSize: 34, fontWeight: 400, textAlign: "center", margin: "0 0 6px", color: COLORS.text, lineHeight: 1.2 }}>
          {showPinyin ? card.pinyin : card.english}
        </p>
        {!revealed && <p style={{ fontSize: 13, color: COLORS.hint, marginTop: 8 }}>{showPinyin ? "What does this mean?" : "How do you say this?"}</p>}
        {revealed && (
          <div style={{ width: "100%", marginTop: 24 }}>
            <div style={{ height: 1, background: COLORS.border, marginBottom: 20 }} />
            <p style={{ fontSize: 20, textAlign: "center", margin: "0 0 6px", color: COLORS.muted, fontWeight: 400 }}>{showPinyin ? card.english : card.pinyin}</p>
            {card.notes && <p style={{ fontSize: 13, textAlign: "center", color: COLORS.hint, margin: "6px 0 0", fontStyle: "italic" }}>{card.notes}</p>}
            <div style={{ marginTop: 24, background: COLORS.bg, borderRadius: 12, padding: "14px 16px" }}>
              {generating ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10, color: COLORS.muted, fontSize: 14 }}>
                  <span style={{ display: "inline-block", width: 14, height: 14, border: `2px solid ${COLORS.border}`, borderTopColor: COLORS.accentMid, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                  Generating example...
                </div>
              ) : (
                <>
                  <p style={{ fontSize: 14, margin: "0 0 4px", color: COLORS.text, lineHeight: 1.6 }}>{boldTarget(card.example_pinyin, card.pinyin)}</p>
                  <p style={{ fontSize: 13, margin: 0, color: COLORS.muted, lineHeight: 1.5 }}>{card.example_english}</p>
                  <button onClick={() => { setGenerating(true); setTimeout(() => setGenerating(false), 1800); }} style={{ marginTop: 10, background: "none", border: "none", cursor: "pointer", fontSize: 12, color: COLORS.hint, padding: 0, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4 }}>
                    ↻ Regenerate
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      {!revealed ? (
        <button onClick={() => setRevealed(true)} style={{ width: "100%", padding: "15px", background: COLORS.accent, color: "#fff", border: "none", borderRadius: 12, fontSize: 16, fontWeight: 500, fontFamily: "inherit", cursor: "pointer" }}>
          Show Answer
        </button>
      ) : (
        <div>
          <p style={{ textAlign: "center", fontSize: 12, color: COLORS.hint, marginBottom: 10, marginTop: 0 }}>How well did you know this?</p>
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            {[
              { label: "Again", sub: "forgot", rating: "again", color: COLORS.again, bg: COLORS.againLight },
              { label: "Hard", sub: "struggled", rating: "hard", color: COLORS.hard, bg: COLORS.hardLight },
              { label: "Good", sub: "recalled", rating: "good", color: COLORS.good, bg: COLORS.goodLight },
              { label: "Easy", sub: "instant", rating: "easy", color: COLORS.easy, bg: COLORS.easyLight },
            ].map(({ label, sub, rating, color, bg }) => (
              <button key={rating} onClick={() => advance(rating)} style={{ flex: 1, padding: "10px 4px 8px", border: `1.5px solid ${bg}`, borderRadius: 10, background: COLORS.surface, cursor: "pointer", fontFamily: "inherit", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                <span style={{ fontSize: 14, fontWeight: 500, color }}>{label}</span>
                <span style={{ fontSize: 11, color: COLORS.hint }}>{sub}</span>
              </button>
            ))}
          </div>
          <div style={{ textAlign: "center" }}>
            <button onClick={() => advance(null, true)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: COLORS.hint, fontFamily: "inherit", padding: "6px 12px", borderRadius: 8 }}>
              Mark as Known
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Session Summary ───────────────────────────────────────────────

function AnimatedBar({ pct, color, delay }) {
  const [width, setWidth] = useState(0);
  useEffect(() => { const t = setTimeout(() => setWidth(pct), delay); return () => clearTimeout(t); }, [pct, delay]);
  return (
    <div style={{ flex: 1, height: 6, background: COLORS.border, borderRadius: 99, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${width}%`, background: color, borderRadius: 99, transition: "width 0.6s cubic-bezier(0.4,0,0.2,1)" }} />
    </div>
  );
}

function AnimatedNumber({ target, delay }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => {
      let start = null;
      function step(ts) {
        if (!start) start = ts;
        const p = Math.min((ts - start) / 700, 1);
        setVal(Math.round(p * target));
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }, delay);
    return () => clearTimeout(t);
  }, [target, delay]);
  return <>{val}</>;
}

function SessionSummary({ data, onDone }) {
  const { total, ratings, graduated, markedKnown } = data;
  const successCount = (ratings.good || 0) + (ratings.easy || 0);
  const successPct = total > 0 ? Math.round((successCount / total) * 100) : 0;
  const ratingMeta = [
    { key: "again", label: "Again", color: COLORS.again, bg: COLORS.againLight },
    { key: "hard",  label: "Hard",  color: COLORS.hard,  bg: COLORS.hardLight },
    { key: "good",  label: "Good",  color: COLORS.good,  bg: COLORS.goodLight },
    { key: "easy",  label: "Easy",  color: COLORS.easy,  bg: COLORS.easyLight },
  ];

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "52px 20px 40px" }}>
      <div style={{ textAlign: "center", marginBottom: 36 }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>🎉</div>
        <h1 style={{ margin: "0 0 6px", fontSize: 26, fontWeight: 500 }}>Session complete</h1>
        <p style={{ margin: 0, fontSize: 15, color: COLORS.muted }}>You reviewed <strong style={{ color: COLORS.text, fontWeight: 500 }}>{total} cards</strong> — nice work.</p>
      </div>

      <div style={{ background: successPct >= 70 ? COLORS.goodLight : COLORS.againLight, border: `1px solid ${successPct >= 70 ? "#C0DD97" : "#F7C1C1"}`, borderRadius: 16, padding: "24px 20px", textAlign: "center", marginBottom: 16 }}>
        <p style={{ margin: "0 0 4px", fontSize: 13, color: successPct >= 70 ? COLORS.good : COLORS.again }}>Good + Easy rate</p>
        <p style={{ margin: 0, fontSize: 52, fontWeight: 500, color: successPct >= 70 ? COLORS.good : COLORS.again, lineHeight: 1.1 }}>
          <AnimatedNumber target={successPct} delay={100} />%
        </p>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ padding: "20px" }}>
          <p style={{ margin: "0 0 16px", fontSize: 11, fontWeight: 500, color: COLORS.hint, textTransform: "uppercase", letterSpacing: "0.07em" }}>Breakdown</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {ratingMeta.map(({ key, label, color, bg }, i) => {
              const count = ratings[key] || 0;
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={key} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color, background: bg, borderRadius: 6, padding: "2px 8px", minWidth: 42, textAlign: "center" }}>{label}</span>
                  <AnimatedBar pct={pct} color={color} delay={200 + i * 80} />
                  <span style={{ fontSize: 13, color: COLORS.muted, minWidth: 52, textAlign: "right" }}>{count} <span style={{ color: COLORS.hint }}>({pct}%)</span></span>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 32 }}>
        {[
          { label: "Graduated this session", value: graduated, icon: "🎓", color: COLORS.accent, bg: COLORS.accentLight },
          { label: "Marked as known", value: markedKnown, icon: "✓", color: COLORS.gray, bg: COLORS.grayLight },
        ].map(({ label, value, icon, color, bg }) => (
          <div key={label} style={{ background: bg, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: "16px" }}>
            <span style={{ fontSize: 20 }}>{icon}</span>
            <p style={{ margin: "8px 0 2px", fontSize: 26, fontWeight: 500, color, lineHeight: 1 }}><AnimatedNumber target={value} delay={300} /></p>
            <p style={{ margin: 0, fontSize: 12, color: COLORS.muted }}>{label}</p>
          </div>
        ))}
      </div>

      <button onClick={onDone} style={{ width: "100%", padding: "16px", background: COLORS.accent, color: "#fff", border: "none", borderRadius: 14, fontSize: 17, fontWeight: 500, fontFamily: "inherit", cursor: "pointer" }}>
        Done
      </button>
    </div>
  );
}

// ── Settings ──────────────────────────────────────────────────────

function Settings({ onBack }) {
  const [newCardsPerDay, setNewCardsPerDay] = useState(20);
  const [direction, setDirection] = useState("PY → EN");
  const [model, setModel] = useState("deepseek-chat");
  const [showConfirm, setShowConfirm] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [suspended, setSuspended] = useState(MOCK_SUSPENDED);

  const sel = { padding: "6px 10px", fontSize: 14, fontFamily: "inherit", border: `1px solid ${COLORS.border}`, borderRadius: 8, background: COLORS.bg, color: COLORS.text, cursor: "pointer", outline: "none" };

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "48px 20px 48px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.muted, fontSize: 22, padding: 0, lineHeight: 1 }}>←</button>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 500 }}>Settings</h1>
      </div>

      <SectionLabel>Study</SectionLabel>
      <Card style={{ marginBottom: 24 }}>
        <Row label="New cards per day" sublabel="Applies from next session">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {["−", "+"].map((sym, i) => (
              <button key={sym} onClick={() => setNewCardsPerDay(n => i === 0 ? Math.max(1, n - 1) : Math.min(100, n + 1))} style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${COLORS.border}`, background: COLORS.bg, cursor: "pointer", fontSize: 16, color: COLORS.muted, display: "flex", alignItems: "center", justifyContent: "center" }}>{sym}</button>
            ))}
            <span style={{ fontSize: 15, fontWeight: 500, minWidth: 24, textAlign: "center", order: -1 }}>{newCardsPerDay}</span>
          </div>
        </Row>
        <Row label="Default direction" last>
          <select value={direction} onChange={e => setDirection(e.target.value)} style={sel}>
            {DIRECTIONS.map(d => <option key={d}>{d}</option>)}
          </select>
        </Row>
      </Card>

      <SectionLabel>AI</SectionLabel>
      <Card style={{ marginBottom: 24, position: "relative" }}>
        <Row label="Deepseek model">
          <select value={model} onChange={e => setModel(e.target.value)} style={sel}>
            {MODELS.map(m => <option key={m}>{m}</option>)}
          </select>
        </Row>
        <Row label="Regenerate all sentences" sublabel="Overwrites cached examples for every card" last>
          <button onClick={() => setShowConfirm(true)} disabled={regenerating} style={{ padding: "7px 14px", background: regenerating ? COLORS.grayLight : COLORS.againLight, color: regenerating ? COLORS.hint : COLORS.again, border: `1px solid ${regenerating ? COLORS.border : "#F7C1C1"}`, borderRadius: 9, fontSize: 13, fontWeight: 500, fontFamily: "inherit", cursor: regenerating ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            {regenerating ? <><span style={{ display: "inline-block", width: 12, height: 12, border: `2px solid ${COLORS.border}`, borderTopColor: COLORS.hint, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} /> Working…</> : "↻ Regenerate"}
          </button>
        </Row>
        {showConfirm && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(28,27,24,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10, borderRadius: 14 }}>
            <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: "24px 20px", margin: "0 20px", maxWidth: 320, width: "100%" }}>
              <p style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 500 }}>Regenerate all sentences?</p>
              <p style={{ margin: "0 0 20px", fontSize: 14, color: COLORS.muted, lineHeight: 1.5 }}>This will call the Deepseek API for every card. Existing sentences will be overwritten.</p>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setShowConfirm(false)} style={{ flex: 1, padding: "10px", background: COLORS.grayLight, color: COLORS.gray, border: `1px solid ${COLORS.border}`, borderRadius: 10, fontSize: 14, fontWeight: 500, fontFamily: "inherit", cursor: "pointer" }}>Cancel</button>
                <button onClick={() => { setShowConfirm(false); setRegenerating(true); setTimeout(() => setRegenerating(false), 2000); }} style={{ flex: 1, padding: "10px", background: COLORS.again, color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 500, fontFamily: "inherit", cursor: "pointer" }}>Regenerate</button>
              </div>
            </div>
          </div>
        )}
      </Card>

      <SectionLabel>Suspended words</SectionLabel>
      <Card>
        {suspended.length === 0
          ? <div style={{ padding: "28px 16px", textAlign: "center" }}><p style={{ margin: 0, fontSize: 14, color: COLORS.hint }}>No suspended words.</p></div>
          : suspended.map((c, i) => (
            <div key={c.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: i < suspended.length - 1 ? `1px solid ${COLORS.border}` : "none" }}>
              <div>
                <span style={{ fontSize: 15, color: COLORS.text }}>{c.pinyin}</span>
                <span style={{ fontSize: 13, color: COLORS.hint, marginLeft: 8 }}>{c.english}</span>
              </div>
              <button onClick={() => setSuspended(s => s.filter(x => x.id !== c.id))} style={{ padding: "5px 12px", background: COLORS.accentLight, color: COLORS.accent, border: `1px solid #CCC9F6`, borderRadius: 8, fontSize: 12, fontWeight: 500, fontFamily: "inherit", cursor: "pointer" }}>
                Unsuspend
              </button>
            </div>
          ))
        }
      </Card>
    </div>
  );
}

// ── App shell ─────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen] = useState("home"); // home | study | summary | settings
  const [summaryData, setSummaryData] = useState(null);

  function handleStudyDone(data) {
    if (!data) { setScreen("home"); return; }
    setSummaryData(data);
    setScreen("summary");
  }

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: COLORS.text }}>
      {screen === "home"     && <Home onStudy={() => setScreen("study")} onSettings={() => setScreen("settings")} />}
      {screen === "study"    && <Study onDone={handleStudyDone} />}
      {screen === "summary"  && summaryData && <SessionSummary data={summaryData} onDone={() => setScreen("home")} />}
      {screen === "settings" && <Settings onBack={() => setScreen("home")} />}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

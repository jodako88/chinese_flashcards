const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';
const DEFAULT_MODEL = 'deepseek-chat';

const headers = {
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers,
    body: JSON.stringify(body),
  };
}

function buildPrompt({ pinyin, english, knownVocab }) {
  return `You are a Chinese language tutor. Generate one example sentence for the word "${pinyin}" (${english}).

Rules:
- Use pinyin only, no characters
- The target word "${pinyin}" must appear in the sentence
- Use ONLY words from the following known vocabulary list. You may also use HSK 1–2 words strictly as grammar particles and connectors (e.g. de, ma, yě, hěn, shì). Do not use HSK 1–2 words as the main content words of the sentence.
- The sentence should be natural and simple
- Return JSON only, no other text: { "example_pinyin": "...", "example_english": "..." }

Known vocab (one word per line):
${knownVocab.join('\n')}`;
}

function parseDeepseekJson(content) {
  const trimmed = content.trim();
  const fencedMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const jsonText = fencedMatch ? fencedMatch[1] : trimmed;

  return JSON.parse(jsonText);
}

function validateGeneratedSentence(sentence) {
  const examplePinyin = String(sentence?.example_pinyin ?? '').trim();
  const exampleEnglish = String(sentence?.example_english ?? '').trim();

  if (!examplePinyin || !exampleEnglish) {
    throw new Error('Deepseek returned an incomplete sentence.');
  }

  return {
    example_pinyin: examplePinyin,
    example_english: exampleEnglish,
  };
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return jsonResponse(204, {});
  }

  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed.' });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;

  if (!apiKey) {
    return jsonResponse(500, { error: 'Sentence generation is not configured.' });
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const pinyin = String(body.pinyin ?? '').trim();
    const english = String(body.english ?? '').trim();
    const knownVocab = Array.isArray(body.knownVocab)
      ? body.knownVocab.map((word) => String(word).trim()).filter(Boolean)
      : [];
    const model = String(body.model ?? DEFAULT_MODEL).trim() || DEFAULT_MODEL;

    if (!pinyin || !english) {
      return jsonResponse(400, { error: 'pinyin and english are required.' });
    }

    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'user',
            content: buildPrompt({ pinyin, english, knownVocab }),
          },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      return jsonResponse(response.status, {
        error: 'Deepseek could not generate a sentence right now.',
      });
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;

    if (!content) {
      return jsonResponse(502, { error: 'Deepseek returned an empty response.' });
    }

    return jsonResponse(200, validateGeneratedSentence(parseDeepseekJson(content)));
  } catch (error) {
    return jsonResponse(500, {
      error: error.message || 'Sentence generation failed.',
    });
  }
}

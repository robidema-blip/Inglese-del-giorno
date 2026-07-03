// ══════════════════════════════════════════════════════════════
// vocab-booster.js — on-demand extra vocabulary, separate from the
// daily lesson. Small, cheap Haiku call (~400 output tokens), only
// triggered when the student explicitly clicks "Get more words" —
// unlike the daily lesson, this is NOT called automatically, so it
// only adds cost when actually used.
// ══════════════════════════════════════════════════════════════

const THEMES = {
  1:'daily life and routines',
  2:'food, cafés and restaurants',
  3:'travel and transport',
  4:'work and technology',
  5:'nature and the environment',
  6:'health and wellbeing',
  7:'shopping and money',
  8:'family and relationships',
};

const NATIVE_LANG_NAMES = {
  it:'Italian',es:'Spanish',fr:'French',pt:'Portuguese',de:'German',
  zh:'Mandarin Chinese',ko:'Korean',ja:'Japanese',ar:'Arabic',
  ru:'Russian',pl:'Polish',nl:'Dutch',
};

const CEFR_BY_SUBLEVEL_PREFIX = {
  A1:'A1 (beginner)', A2:'A2 (elementary)', B1:'B1 (intermediate)',
  B2:'B2 (upper intermediate)', C1:'C1 (advanced)',
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const {
    subLevel   = 'A1.1',
    nativeLang = 'it',
    themeId    = 1,
    excludeWords = [],
  } = req.body;

  const cefr = String(subLevel).split('.')[0];
  const cefrLabel = CEFR_BY_SUBLEVEL_PREFIX[cefr] || 'A1 (beginner)';
  const theme = THEMES[themeId] || THEMES[1];
  const nativeName = NATIVE_LANG_NAMES[nativeLang] || 'Italian';
  const excludeList = excludeWords.length
    ? `Do NOT repeat any of these words already given to the student: ${excludeWords.slice(-80).join(', ')}.`
    : '';

  const prompt = `You are an English vocabulary coach for a ${nativeName}-speaking student at ${cefrLabel} level.

Give 5 additional useful English words or short phrases related to the theme "${theme}", appropriate for ${cefrLabel}.
${excludeList}
For each: an example sentence in English using it naturally, and the sentence's ${nativeName} translation.

Respond ONLY in this exact JSON, no markdown, no preamble:
{
  "words": [
    {"en":"word","native":"${nativeName} translation","exampleEn":"Example sentence.","exampleNative":"${nativeName} translation of the example"}
  ]
}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!response.ok) {
      const err = await response.json();
      return res.status(response.status).json({ error: err.error?.message || 'Claude API error' });
    }
    const data = await response.json();
    const text = data.content.map(b => b.text || '').join('');
    const clean = text.replace(/```json|```/g, '').trim();
    return res.status(200).json(JSON.parse(clean));
  } catch (err) {
    console.error('vocab-booster.js error:', err);
    return res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
}
